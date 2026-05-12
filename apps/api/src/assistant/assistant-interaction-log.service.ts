import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type { AssistantChannel, AssistantFinalizedTurn, AssistantSessionContext } from './assistant.types';

type CreateInteractionLogInput = {
  userQuery: string;
  assistantSummary?: string | null;
  toolsUsed?: string[];
  actionOutcome?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AssistantInteractionLogService {
  constructor(private readonly prisma: PrismaService) {}

  async createLog(
    session: Pick<
      AssistantSessionContext,
      | 'userId'
      | 'channel'
      | 'voiceSessionId'
      | 'requestId'
      | 'preferredLanguage'
      | 'detectedLanguage'
      | 'focusFarmPlotId'
      | 'focusCropSeasonId'
    >,
    input: CreateInteractionLogInput,
  ) {
    return (this.prisma as any).assistantInteractionLog.create({
      data: {
        userId: session.userId,
        channel: session.channel,
        voiceSessionId: session.voiceSessionId ?? null,
        requestId: session.requestId ?? null,
        preferredLanguage: session.preferredLanguage ?? null,
        detectedLanguage: session.detectedLanguage ?? null,
        focusFarmPlotId: session.focusFarmPlotId ?? null,
        focusCropSeasonId: session.focusCropSeasonId ?? null,
        userQuery: input.userQuery,
        assistantSummary: input.assistantSummary ?? null,
        toolsUsed: input.toolsUsed ?? [],
        actionOutcome: input.actionOutcome ?? null,
        errorCode: input.errorCode ?? null,
        errorMessage: input.errorMessage ?? null,
        metadata: input.metadata ?? null,
      },
    });
  }

  async finalizeTurn(session: AssistantSessionContext, turn: AssistantFinalizedTurn) {
    return this.createLog(session, {
      userQuery: turn.userTranscript,
      assistantSummary: turn.assistantTranscript ?? null,
      toolsUsed: turn.toolsUsed,
      actionOutcome: turn.actionOutcome ?? null,
      errorCode: turn.errorCode ?? null,
      errorMessage: turn.errorMessage ?? null,
      metadata: turn.metadata,
    });
  }
}
