-- AlterEnum
ALTER TYPE "AlertType" ADD VALUE IF NOT EXISTS 'COMMUNITY';

-- CreateEnum
CREATE TYPE "CommunityCategory" AS ENUM (
  'QUESTION',
  'PEST_DISEASE',
  'WATER',
  'NUTRITION',
  'MARKET',
  'SUCCESS',
  'WARNING'
);

-- CreateEnum
CREATE TYPE "CommunityReportTarget" AS ENUM ('POST', 'REPLY');

-- CreateEnum
CREATE TYPE "CommunityReportReason" AS ENUM (
  'MISLEADING',
  'ABUSIVE',
  'UNSAFE',
  'SPAM',
  'OTHER'
);

-- AlterTable
ALTER TABLE "Alert" ALTER COLUMN "cropSeasonId" DROP NOT NULL;
ALTER TABLE "Alert" ADD COLUMN "ctaRoute" TEXT;

-- CreateTable
CREATE TABLE "CommunityPost" (
  "id" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "category" "CommunityCategory" NOT NULL,
  "cropSeasonId" TEXT,
  "cropName" TEXT,
  "currentStage" TEXT,
  "village" TEXT,
  "district" TEXT,
  "state" TEXT,
  "imageUrl" TEXT,
  "hidden" BOOLEAN NOT NULL DEFAULT false,
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "replyCount" INTEGER NOT NULL DEFAULT 0,
  "reportCount" INTEGER NOT NULL DEFAULT 0,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReply" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "hidden" BOOLEAN NOT NULL DEFAULT false,
  "reportCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CommunityReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReport" (
  "id" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "targetType" "CommunityReportTarget" NOT NULL,
  "targetId" TEXT NOT NULL,
  "reason" "CommunityReportReason" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),

  CONSTRAINT "CommunityReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityPost_authorId_createdAt_idx" ON "CommunityPost"("authorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CommunityPost_cropSeasonId_createdAt_idx" ON "CommunityPost"("cropSeasonId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CommunityPost_category_hidden_createdAt_idx" ON "CommunityPost"("category", "hidden", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CommunityPost_district_state_hidden_createdAt_idx" ON "CommunityPost"("district", "state", "hidden", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CommunityPost_hidden_lastActivityAt_idx" ON "CommunityPost"("hidden", "lastActivityAt" DESC);

-- CreateIndex
CREATE INDEX "CommunityReply_postId_createdAt_idx" ON "CommunityReply"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityReply_authorId_createdAt_idx" ON "CommunityReply"("authorId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityReport_reporterId_targetType_targetId_key" ON "CommunityReport"("reporterId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "CommunityReport_targetType_targetId_createdAt_idx" ON "CommunityReport"("targetType", "targetId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CommunityReport_resolvedAt_createdAt_idx" ON "CommunityReport"("resolvedAt", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_cropSeasonId_fkey" FOREIGN KEY ("cropSeasonId") REFERENCES "CropSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReply" ADD CONSTRAINT "CommunityReply_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReply" ADD CONSTRAINT "CommunityReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReport" ADD CONSTRAINT "CommunityReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
