-- AlterTable
ALTER TABLE "AssistantMessage"
ADD COLUMN "attachments" JSONB,
ADD COLUMN "responseMeta" JSONB;
