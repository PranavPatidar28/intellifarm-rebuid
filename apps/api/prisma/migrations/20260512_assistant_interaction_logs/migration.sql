CREATE TABLE "AssistantInteractionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "voiceSessionId" TEXT,
    "requestId" TEXT,
    "preferredLanguage" TEXT,
    "detectedLanguage" TEXT,
    "focusFarmPlotId" TEXT,
    "focusCropSeasonId" TEXT,
    "userQuery" TEXT NOT NULL,
    "assistantSummary" TEXT,
    "toolsUsed" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "actionOutcome" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantInteractionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssistantInteractionLog_userId_createdAt_idx" ON "AssistantInteractionLog"("userId", "createdAt" DESC);
CREATE INDEX "AssistantInteractionLog_voiceSessionId_createdAt_idx" ON "AssistantInteractionLog"("voiceSessionId", "createdAt" DESC);
CREATE INDEX "AssistantInteractionLog_requestId_createdAt_idx" ON "AssistantInteractionLog"("requestId", "createdAt" DESC);

ALTER TABLE "AssistantInteractionLog"
ADD CONSTRAINT "AssistantInteractionLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
