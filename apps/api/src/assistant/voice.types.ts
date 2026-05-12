import type { WebSocket as WsClient } from 'ws';

import type { GeminiLiveSession } from './gemini-live.service';
import type { PendingVoiceAction } from './assistant.types';

export type VoiceSessionState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'processing'
  | 'tool'
  | 'speaking'
  | 'reconnecting'
  | 'error'
  | 'closed';

export type VoiceClientEvent =
  | {
      event: 'input.audio';
      data: {
        audio: string;
      };
    }
  | {
      event: 'input.audio_end';
      data?: Record<string, never>;
    }
  | {
      event: 'action.confirm';
      data?: {
        actionId?: string;
      };
    }
  | {
      event: 'action.cancel';
      data?: {
        actionId?: string;
      };
    }
  | {
      event: 'session.end';
      data?: Record<string, never>;
    };

export type VoiceServerEvent =
  | {
      event: 'session.ready';
      data: {
        voiceSessionId: string;
        reconnectGraceSeconds: number;
        state: VoiceSessionState;
      };
    }
  | {
      event: 'state.update';
      data: {
        state: VoiceSessionState;
        message?: string;
      };
    }
  | {
      event: 'transcript.input';
      data: {
        text: string;
        final: boolean;
      };
    }
  | {
      event: 'transcript.output';
      data: {
        text: string;
        final: boolean;
      };
    }
  | {
      event: 'audio.output';
      data: {
        audio: string;
        sampleRate: number;
        interrupt?: boolean;
      };
    }
  | {
      event: 'tool.status';
      data: {
        toolName: string;
        status: 'started' | 'completed' | 'failed' | 'cancelled' | 'requires_confirmation';
        message?: string;
      };
    }
  | {
      event: 'action.confirmation_required';
      data: {
        action: PendingVoiceAction;
        message: string;
      };
    }
  | {
      event: 'turn.summary';
      data: {
        userTranscript: string;
        assistantTranscript: string;
        toolsUsed: string[];
      };
    }
  | {
      event: 'session.error';
      data: {
        code: string;
        message: string;
      };
    }
  | {
      event: 'session.closed';
      data: {
        reason: string;
      };
    };

export type VoiceSessionTicketPayload = {
  sub: string;
  sid: string;
  type: 'assistant-voice';
};

export type VoiceSessionRecord = {
  id: string;
  userId: string;
  clientIp: string;
  preferredLanguage: 'en' | 'hi';
  focusFarmPlotId: string | null;
  focusCropSeasonId: string | null;
  state: VoiceSessionState;
  client: WsClient | null;
  gemini: GeminiLiveSession | null;
  resumptionHandle: string | null;
  lastConsumedClientMessageIndex: string | null;
  disconnectTimer: NodeJS.Timeout | null;
  pendingConfirmation: PendingVoiceAction | null;
  confirmedActionId: string | null;
  currentInputTranscript: string;
  currentOutputTranscript: string;
  currentToolsUsed: Set<string>;
  lastTurnSummary: {
    userTranscript: string;
    assistantTranscript: string;
    toolsUsed: string[];
  } | null;
  createdAt: number;
  updatedAt: number;
};
