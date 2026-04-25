-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('MANDI', 'WAREHOUSE');

-- CreateEnum
CREATE TYPE "PredictionType" AS ENUM ('CROP_SUGGESTION', 'RESOURCE_ESTIMATE');

-- CreateEnum
CREATE TYPE "PredictionStatus" AS ENUM ('COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AssistantMessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "DiseaseCaptureMode" AS ENUM ('STANDARD', 'CAMERA_DUAL_ANGLE');

-- CreateEnum
CREATE TYPE "DiseaseAnalysisSource" AS ENUM ('MOCK_PROVIDER', 'LIVE_PROVIDER');

-- AlterTable
ALTER TABLE "DiseaseReport"
ADD COLUMN "analysisSource" "DiseaseAnalysisSource" NOT NULL DEFAULT 'MOCK_PROVIDER',
ADD COLUMN "captureMode" "DiseaseCaptureMode" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'mock',
ADD COLUMN "providerRef" TEXT;

-- AlterTable
ALTER TABLE "MarketRecord"
ADD COLUMN "facilityId" TEXT;

-- AlterTable
ALTER TABLE "Scheme"
ADD COLUMN "relatedCrops" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "type" "FacilityType" NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "village" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "farmPlotId" TEXT,
    "cropSeasonId" TEXT,
    "type" "PredictionType" NOT NULL,
    "inputJson" JSONB NOT NULL,
    "outputJson" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "PredictionStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantThread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" "AssistantMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "safetyFlags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Facility_type_state_district_active_idx"
ON "Facility"("type", "state", "district", "active");

-- CreateIndex
CREATE INDEX "PredictionRun_userId_type_createdAt_idx"
ON "PredictionRun"("userId", "type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PredictionRun_farmPlotId_createdAt_idx"
ON "PredictionRun"("farmPlotId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PredictionRun_cropSeasonId_createdAt_idx"
ON "PredictionRun"("cropSeasonId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AssistantThread_userId_updatedAt_idx"
ON "AssistantThread"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "AssistantMessage_threadId_createdAt_idx"
ON "AssistantMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketRecord_facilityId_recordDate_idx"
ON "MarketRecord"("facilityId", "recordDate" DESC);

-- AddForeignKey
ALTER TABLE "MarketRecord"
ADD CONSTRAINT "MarketRecord_facilityId_fkey"
FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionRun"
ADD CONSTRAINT "PredictionRun_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionRun"
ADD CONSTRAINT "PredictionRun_farmPlotId_fkey"
FOREIGN KEY ("farmPlotId") REFERENCES "FarmPlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionRun"
ADD CONSTRAINT "PredictionRun_cropSeasonId_fkey"
FOREIGN KEY ("cropSeasonId") REFERENCES "CropSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantThread"
ADD CONSTRAINT "AssistantThread_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantMessage"
ADD CONSTRAINT "AssistantMessage_threadId_fkey"
FOREIGN KEY ("threadId") REFERENCES "AssistantThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
