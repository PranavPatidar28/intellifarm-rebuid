import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenAI,
  Modality,
  type FunctionCall,
  type FunctionResponse,
  type LiveServerMessage,
  type Session,
} from '@google/genai';

import { buildAssistantSystemPrompt } from './assistant-prompt.config';
import { AssistantToolRegistryService } from './assistant-tool-registry.service';
import type { AssistantSessionContext, AssistantToolResult } from './assistant.types';

export type GeminiLiveSession = {
  sendAudio: (base64Audio: string) => void;
  endAudio: () => void;
  sendText: (text: string) => void;
  sendToolResponse: (responses: FunctionResponse | FunctionResponse[]) => void;
  close: () => void;
};

export type GeminiLiveCallbacks = {
  onReady: () => void;
  onState: (state: 'listening' | 'processing' | 'tool' | 'speaking', message?: string) => void;
  onAudio: (base64Audio: string, options?: { interrupt?: boolean; sampleRate?: number }) => void;
  onInputTranscript: (text: string, final: boolean) => void;
  onOutputTranscript: (text: string, final: boolean) => void;
  onToolStatus: (
    toolName: string,
    status: 'started' | 'completed' | 'failed' | 'cancelled' | 'requires_confirmation',
    message?: string,
  ) => void;
  onToolResult: (toolName: string, result: AssistantToolResult) => void;
  onTurnComplete: () => void;
  onError: (code: string, message: string) => void;
  onClose: () => void;
  onResumptionUpdate: (handle: string | null, lastConsumedClientMessageIndex?: string | null) => void;
};

@Injectable()
export class GeminiLiveService {
  private readonly logger = new Logger(GeminiLiveService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly toolRegistry: AssistantToolRegistryService,
  ) {}

  async createSession(params: {
    session: AssistantSessionContext;
    resumptionHandle?: string | null;
    callbacks: GeminiLiveCallbacks;
  }): Promise<GeminiLiveSession> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('GEMINI_API_KEY is not configured');
    }

    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: this.configService.get<string>('GEMINI_API_VERSION', 'v1alpha'),
    });
    const model = this.configService.get<string>(
      'GEMINI_LIVE_MODEL',
      'gemini-3.1-flash-live-preview',
    );
    const voiceName = this.configService.get<string>('GEMINI_LIVE_VOICE_NAME', 'Aoede');
    let liveSession: Session | null = null;

    const sendFunctionResponse = (functionCall: FunctionCall, result: unknown) => {
      if (!liveSession) {
        return;
      }

      liveSession.sendToolResponse({
        functionResponses: [
          {
            id: functionCall.id,
            name: functionCall.name,
            response: result as Record<string, unknown>,
          },
        ],
      });
    };

    liveSession = await ai.live.connect({
      model,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          languageCode: params.session.preferredLanguage === 'hi' ? 'hi-IN' : 'en-IN',
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName,
            },
          },
        },
        systemInstruction: {
          role: 'system',
          parts: [
            {
              text: buildAssistantSystemPrompt({
                channel: 'VOICE',
                session: params.session,
              }),
            },
          ],
        },
        tools: [
          {
            functionDeclarations: this.toolRegistry.getToolDeclarations(),
          },
        ],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        sessionResumption: params.resumptionHandle
          ? { handle: params.resumptionHandle }
          : undefined,
      },
      callbacks: {
        onopen: () => {
          this.logger.log(`Gemini Live socket open for voice session ${params.session.voiceSessionId}`);
        },
        onmessage: async (message) => {
          await this.handleMessage(message, params.session, params.callbacks, sendFunctionResponse);
        },
        onerror: (event) => {
          const message = 'Gemini Live connection error';
          this.logger.warn(`${message}: ${String(event)}`);
          params.callbacks.onError('gemini_connection_error', message);
        },
        onclose: () => {
          params.callbacks.onClose();
        },
      },
    });

    return {
      sendAudio: (base64Audio) => {
        liveSession?.sendRealtimeInput({
          audio: {
            data: base64Audio,
            mimeType: 'audio/pcm;rate=16000',
          },
        });
      },
      endAudio: () => {
        liveSession?.sendRealtimeInput({ audioStreamEnd: true });
        params.callbacks.onState('processing');
      },
      sendText: (text) => {
        liveSession?.sendClientContent({
          turns: [
            {
              role: 'user',
              parts: [{ text }],
            },
          ],
          turnComplete: true,
        });
      },
      sendToolResponse: (responses) => {
        liveSession?.sendToolResponse({ functionResponses: responses });
      },
      close: () => {
        liveSession?.close();
        liveSession = null;
      },
    };
  }

  private async handleMessage(
    message: LiveServerMessage,
    session: AssistantSessionContext,
    callbacks: GeminiLiveCallbacks,
    sendFunctionResponse: (functionCall: FunctionCall, result: unknown) => void,
  ) {
    if (message.setupComplete) {
      callbacks.onReady();
    }

    if (message.sessionResumptionUpdate) {
      callbacks.onResumptionUpdate(
        message.sessionResumptionUpdate.resumable
          ? message.sessionResumptionUpdate.newHandle ?? null
          : null,
        message.sessionResumptionUpdate.lastConsumedClientMessageIndex ?? null,
      );
    }

    if (message.serverContent?.interrupted) {
      callbacks.onAudio('', { interrupt: true, sampleRate: 24000 });
      callbacks.onState('listening', 'Interrupted by farmer');
    }

    const inputTranscription = message.serverContent?.inputTranscription?.text;
    if (inputTranscription) {
      callbacks.onInputTranscript(inputTranscription, Boolean(message.serverContent?.turnComplete));
    }

    const outputTranscription = message.serverContent?.outputTranscription?.text;
    if (outputTranscription) {
      callbacks.onOutputTranscript(outputTranscription, Boolean(message.serverContent?.turnComplete));
    }

    const parts = message.serverContent?.modelTurn?.parts ?? [];
    for (const part of parts) {
      if ('inlineData' in part && part.inlineData?.data) {
        callbacks.onState('speaking');
        callbacks.onAudio(part.inlineData.data, {
          sampleRate: 24000,
        });
      }
    }

    if (message.toolCall?.functionCalls?.length) {
      callbacks.onState('tool');
      await Promise.all(
        message.toolCall.functionCalls.map(async (functionCall) => {
          const toolName = functionCall.name ?? 'unknown';
          callbacks.onToolStatus(toolName, 'started');

          try {
            const result = await this.toolRegistry.execute(
              toolName,
              functionCall.args ?? {},
              {
                session,
                allowSideEffects: false,
              },
            );

            callbacks.onToolResult(toolName, result);
            callbacks.onToolStatus(
              toolName,
              result.requiresConfirmation ? 'requires_confirmation' : 'completed',
              result.requiresConfirmation?.message,
            );
            sendFunctionResponse(functionCall, result);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Tool execution failed';
            callbacks.onToolStatus(toolName, 'failed', message);
            sendFunctionResponse(functionCall, {
              ok: false,
              error: {
                code: 'tool_execution_failed',
                message,
              },
            });
          }
        }),
      );
    }

    if (message.toolCallCancellation?.ids?.length) {
      for (const id of message.toolCallCancellation.ids) {
        callbacks.onToolStatus(id, 'cancelled');
      }
    }

    if (message.serverContent?.turnComplete) {
      callbacks.onTurnComplete();
      callbacks.onState('listening');
    }
  }
}
