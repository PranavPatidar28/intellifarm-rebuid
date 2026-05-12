import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IncomingMessage } from 'http';
import { Server, WebSocket as WsClient } from 'ws';

import { AssistantInteractionLogService } from './assistant-interaction-log.service';
import { AssistantToolRegistryService } from './assistant-tool-registry.service';
import { GeminiLiveService } from './gemini-live.service';
import { VoiceSessionStoreService } from './voice-session-store.service';
import { VoiceTicketService } from './voice-ticket.service';
import type { VoiceClientEvent, VoiceServerEvent, VoiceSessionRecord } from './voice.types';

const VOICE_WS_PATH = '/voice';

@WebSocketGateway({ path: VOICE_WS_PATH })
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(VoiceGateway.name);
  private readonly clientSessions = new WeakMap<WsClient, VoiceSessionRecord>();

  constructor(
    private readonly configService: ConfigService,
    private readonly geminiLiveService: GeminiLiveService,
    private readonly interactionLogService: AssistantInteractionLogService,
    private readonly sessionStore: VoiceSessionStoreService,
    private readonly toolRegistry: AssistantToolRegistryService,
    private readonly ticketService: VoiceTicketService,
  ) {}

  async handleConnection(client: WsClient, request?: IncomingMessage) {
    try {
      const ticket = this.extractTicket(request);
      const payload = this.ticketService.verifyTicket(ticket);
      const record = this.sessionStore.get(payload.sid);

      if (!record || record.userId !== payload.sub) {
        throw new Error('Voice session no longer exists.');
      }

      this.sessionStore.clearReconnectCleanup(record);
      if (record.client && record.client.readyState === WsClient.OPEN) {
        record.client.close(1000, 'superseded');
      }

      record.client = client;
      record.state = 'connecting';
      this.clientSessions.set(client, record);
      this.bindRawMessageHandler(client);

      try {
        await this.attachGemini(record);
      } catch (geminiError) {
        const errorMessage =
          geminiError instanceof Error
            ? geminiError.message
            : 'Could not connect to the voice AI service.';
        this.logger.error(
          `Failed to attach Gemini for voice session ${record.id}: ${errorMessage}`,
        );
        this.sendEvent(client, {
          event: 'session.error',
          data: {
            code: 'gemini_setup_failed',
            message: `Voice AI is temporarily unavailable: ${errorMessage}`,
          },
        });
        this.sendEvent(client, {
          event: 'session.closed',
          data: { reason: 'gemini_setup_failed' },
        });
        this.sessionStore.close(record, 'gemini_setup_failed');
        client.close(1011, 'gemini_setup_failed');
      }
    } catch (error) {
      this.sendEvent(client, {
        event: 'session.error',
        data: {
          code: 'voice_connection_rejected',
          message: error instanceof Error ? error.message : 'Voice connection rejected.',
        },
      });
      client.close(1008, 'unauthorized');
    }
  }

  handleDisconnect(client: WsClient) {
    const record = this.clientSessions.get(client);
    if (!record || record.client !== client) {
      return;
    }

    record.client = null;
    record.state = 'reconnecting';
    record.gemini?.close();
    record.gemini = null;
    this.sessionStore.scheduleReconnectCleanup(record, () => {
      this.emitClosed(record, 'reconnect_timeout');
    });
  }

  private bindRawMessageHandler(client: WsClient) {
    client.on('message', async (raw) => {
      const record = this.clientSessions.get(client);
      if (!record || record.state === 'closed') {
        return;
      }

      try {
        const event = this.parseClientEvent(raw);
        await this.handleClientEvent(record, event);
      } catch (error) {
        this.sendEvent(client, {
          event: 'session.error',
          data: {
            code: 'invalid_voice_event',
            message: error instanceof Error ? error.message : 'Invalid voice event.',
          },
        });
      }
    });
  }

  private async attachGemini(record: VoiceSessionRecord) {
    const sessionContext = this.sessionStore.toAssistantSession(record);
    record.gemini = await this.geminiLiveService.createSession({
      session: sessionContext,
      resumptionHandle: record.resumptionHandle,
      callbacks: {
        onReady: () => {
          record.state = 'listening';
          this.sendEvent(record.client, {
            event: 'session.ready',
            data: {
              voiceSessionId: record.id,
              reconnectGraceSeconds: this.sessionStore.getReconnectGraceSeconds(),
              state: 'listening',
            },
          });
        },
        onState: (state, message) => {
          record.state = state;
          this.sendEvent(record.client, {
            event: 'state.update',
            data: { state, message },
          });
        },
        onAudio: (audio, options) => {
          this.sendEvent(record.client, {
            event: 'audio.output',
            data: {
              audio,
              sampleRate: options?.sampleRate ?? 24000,
              interrupt: options?.interrupt,
            },
          });
        },
        onInputTranscript: (text, final) => {
          record.currentInputTranscript = final
            ? text
            : appendTranscript(record.currentInputTranscript, text);
          this.sendEvent(record.client, {
            event: 'transcript.input',
            data: { text: record.currentInputTranscript, final },
          });
        },
        onOutputTranscript: (text, final) => {
          record.currentOutputTranscript = final
            ? text
            : appendTranscript(record.currentOutputTranscript, text);
          this.sendEvent(record.client, {
            event: 'transcript.output',
            data: { text: record.currentOutputTranscript, final },
          });
        },
        onToolStatus: (toolName, status, message) => {
          record.currentToolsUsed.add(toolName);
          this.sendEvent(record.client, {
            event: 'tool.status',
            data: { toolName, status, message },
          });
        },
        onToolResult: (toolName, result) => {
          record.currentToolsUsed.add(toolName);
          applySessionUpdates(record, result.contextUpdates);

          if (result.requiresConfirmation) {
            record.pendingConfirmation = result.requiresConfirmation.action;
            this.sendEvent(record.client, {
              event: 'action.confirmation_required',
              data: result.requiresConfirmation,
            });
          }
        },
        onTurnComplete: () => {
          void this.finalizeTurn(record);
        },
        onError: (code, message) => {
          record.state = 'error';
          this.sendEvent(record.client, {
            event: 'session.error',
            data: { code, message },
          });
        },
        onClose: () => {
          if (record.state !== 'closed') {
            record.gemini = null;
          }
        },
        onResumptionUpdate: (handle, lastConsumedClientMessageIndex) => {
          record.resumptionHandle = handle;
          record.lastConsumedClientMessageIndex = lastConsumedClientMessageIndex ?? null;
          this.sessionStore.markUpdated(record);
        },
      },
    });
  }

  private async handleClientEvent(record: VoiceSessionRecord, event: VoiceClientEvent) {
    switch (event.event) {
      case 'input.audio':
        this.validateAudio(event.data.audio);
        if (record.state === 'speaking') {
          this.sendEvent(record.client, {
            event: 'audio.output',
            data: { audio: '', sampleRate: 24000, interrupt: true },
          });
        }
        record.state = 'listening';
        record.gemini?.sendAudio(event.data.audio);
        return;

      case 'input.audio_end':
        record.state = 'processing';
        this.sendEvent(record.client, {
          event: 'state.update',
          data: { state: 'processing' },
        });
        record.gemini?.endAudio();
        return;

      case 'action.confirm':
        await this.confirmPendingAction(record, event.data?.actionId);
        return;

      case 'action.cancel':
        this.cancelPendingAction(record, event.data?.actionId);
        return;

      case 'session.end':
        this.emitClosed(record, 'client_ended');
        this.sessionStore.close(record, 'client_ended');
        return;
    }
  }

  private async confirmPendingAction(record: VoiceSessionRecord, actionId?: string) {
    const pending = record.pendingConfirmation;
    if (!pending || (actionId && pending.id !== actionId)) {
      this.sendEvent(record.client, {
        event: 'session.error',
        data: {
          code: 'confirmation_not_found',
          message: 'There is no matching pending action to confirm.',
        },
      });
      return;
    }

    const sessionContext = this.sessionStore.toAssistantSession(record);
    const result = await this.toolRegistry.executePendingConfirmation(pending, {
      session: sessionContext,
      allowSideEffects: true,
    });

    applySessionUpdates(record, result.contextUpdates);
    record.pendingConfirmation = null;
    record.confirmedActionId = pending.id;
    record.currentToolsUsed.add(pending.toolName);

    this.sendEvent(record.client, {
      event: 'tool.status',
      data: {
        toolName: pending.toolName,
        status: result.ok ? 'completed' : 'failed',
        message: result.ok ? 'Confirmed action completed.' : result.error?.message,
      },
    });

    record.gemini?.sendText(
      result.ok
        ? `The farmer confirmed ${pending.toolName}. The server executed it successfully. Briefly confirm the result.`
        : `The farmer confirmed ${pending.toolName}, but the server could not execute it: ${JSON.stringify(result)}. Briefly explain the next step.`,
    );
  }

  private cancelPendingAction(record: VoiceSessionRecord, actionId?: string) {
    const pending = record.pendingConfirmation;
    if (!pending || (actionId && pending.id !== actionId)) {
      return;
    }

    record.pendingConfirmation = null;
    this.sendEvent(record.client, {
      event: 'tool.status',
      data: {
        toolName: pending.toolName,
        status: 'cancelled',
        message: 'Farmer cancelled the device action.',
      },
    });
    record.gemini?.sendText(
      `The farmer cancelled ${pending.toolName}. Briefly acknowledge and continue helping.`,
    );
  }

  private async finalizeTurn(record: VoiceSessionRecord) {
    const summary = {
      userTranscript: record.currentInputTranscript.trim(),
      assistantTranscript: record.currentOutputTranscript.trim(),
      toolsUsed: [...record.currentToolsUsed],
    };

    if (!summary.userTranscript && !summary.assistantTranscript) {
      return;
    }

    record.lastTurnSummary = summary;
    this.sendEvent(record.client, {
      event: 'turn.summary',
      data: summary,
    });

    await this.interactionLogService.finalizeTurn(this.sessionStore.toAssistantSession(record), {
      userTranscript: summary.userTranscript || '(voice turn)',
      assistantTranscript: summary.assistantTranscript,
      toolsUsed: summary.toolsUsed,
    });

    record.currentInputTranscript = '';
    record.currentOutputTranscript = '';
    record.currentToolsUsed.clear();
  }

  private parseClientEvent(raw: Buffer | ArrayBuffer | Buffer[]) {
    const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : raw.toString();
    const parsed = JSON.parse(text) as VoiceClientEvent;
    const allowedEvents = new Set([
      'input.audio',
      'input.audio_end',
      'action.confirm',
      'action.cancel',
      'session.end',
    ]);

    if (!parsed || typeof parsed !== 'object' || !allowedEvents.has(parsed.event)) {
      throw new Error('Unknown voice event.');
    }

    return parsed;
  }

  private validateAudio(base64Audio: string) {
    if (!base64Audio || typeof base64Audio !== 'string') {
      throw new Error('Audio chunk is required.');
    }

    const maxBytes = this.configService.get<number>('VOICE_MAX_AUDIO_CHUNK_BYTES', 96 * 1024);
    const estimatedBytes = Math.floor((base64Audio.length * 3) / 4);
    if (estimatedBytes > maxBytes) {
      throw new Error('Audio chunk is too large.');
    }

    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64Audio)) {
      throw new Error('Audio chunk must be base64 PCM.');
    }
  }

  private extractTicket(request?: IncomingMessage) {
    if (!request?.url) {
      throw new Error('Missing voice session ticket.');
    }

    const url = new URL(request.url, 'http://localhost');
    const ticket = url.searchParams.get('ticket');
    if (!ticket) {
      throw new Error('Missing voice session ticket.');
    }

    return ticket;
  }

  private sendEvent(client: WsClient | null, event: VoiceServerEvent) {
    if (!client || client.readyState !== WsClient.OPEN) {
      return;
    }

    client.send(JSON.stringify(event));
  }

  private emitClosed(record: VoiceSessionRecord, reason: string) {
    this.sendEvent(record.client, {
      event: 'session.closed',
      data: { reason },
    });
  }
}

function appendTranscript(existing: string, incoming: string) {
  if (!existing) {
    return incoming;
  }

  if (incoming.startsWith(existing)) {
    return incoming;
  }

  return `${existing} ${incoming}`.trim();
}

function applySessionUpdates(
  record: VoiceSessionRecord,
  updates:
    | {
        focusFarmPlotId?: string | null;
        focusCropSeasonId?: string | null;
      }
    | undefined,
) {
  if (!updates) {
    return;
  }

  if ('focusFarmPlotId' in updates) {
    record.focusFarmPlotId = updates.focusFarmPlotId ?? null;
  }

  if ('focusCropSeasonId' in updates) {
    record.focusCropSeasonId = updates.focusCropSeasonId ?? null;
  }
}
