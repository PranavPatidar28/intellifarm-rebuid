export type AssistantChannel = 'TEXT' | 'VOICE';

export type PendingVoiceAction = {
  id: string;
  toolName: 'turnPumpOn' | 'turnPumpOff';
  parameters: Record<string, unknown>;
  confirmationMessage: string;
  requestedAt: string;
};

export type AssistantSessionContext = {
  userId: string;
  channel: AssistantChannel;
  preferredLanguage?: string | null;
  requestId?: string | null;
  voiceSessionId?: string | null;
  focusFarmPlotId?: string | null;
  focusCropSeasonId?: string | null;
  activeFarmName?: string | null;
  activeCropName?: string | null;
  activeFieldLabel?: string | null;
  detectedLanguage?: string | null;
  pendingConfirmation?: PendingVoiceAction | null;
};

export type AssistantToolError = {
  code: string;
  message: string;
  retryable?: boolean;
};

export type AssistantConfirmationRequest = {
  action: PendingVoiceAction;
  message: string;
};

export type AssistantImageRequest = {
  message: string;
  acceptedMimeTypes: string[];
};

export type AssistantUnavailableState = {
  code: string;
  message: string;
};

export type AssistantToolResult = {
  ok: boolean;
  data?: unknown;
  error?: AssistantToolError;
  requiresConfirmation?: AssistantConfirmationRequest;
  requiresImages?: AssistantImageRequest;
  unavailable?: AssistantUnavailableState;
  contextUpdates?: Partial<
    Pick<
      AssistantSessionContext,
      | 'focusFarmPlotId'
      | 'focusCropSeasonId'
      | 'activeFarmName'
      | 'activeCropName'
      | 'activeFieldLabel'
      | 'detectedLanguage'
    >
  >;
};

export type AssistantHistoryMessage = {
  role: 'user' | 'assistant' | 'system';
  content: unknown;
};

export type AssistantToolExecutionContext = {
  session: AssistantSessionContext;
  historyMessages?: AssistantHistoryMessage[];
  allowSideEffects?: boolean;
};

export type AssistantToolExecutionEnvelope = {
  result: AssistantToolResult;
  sessionUpdates?: Partial<AssistantSessionContext>;
};

export type AssistantFinalizedTurn = {
  userTranscript: string;
  assistantTranscript?: string | null;
  toolsUsed: string[];
  actionOutcome?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
};
