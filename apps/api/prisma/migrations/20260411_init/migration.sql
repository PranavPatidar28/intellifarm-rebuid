-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PreferredLanguage" AS ENUM ('en', 'hi');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FARMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "IrrigationType" AS ENUM ('RAIN_FED', 'DRIP', 'SPRINKLER', 'FLOOD', 'MANUAL');

-- CreateEnum
CREATE TYPE "CropSeasonStatus" AS ENUM ('PLANNED', 'ACTIVE', 'HARVESTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('IRRIGATION', 'FERTILIZER', 'SCOUTING', 'HARVEST_PREP', 'GENERAL');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('WEATHER', 'TASK', 'DISEASE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DiseaseReportStatus" AS ENUM ('PENDING', 'ANALYZED', 'ESCALATED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "preferredLanguage" "PreferredLanguage" NOT NULL DEFAULT 'en',
    "state" TEXT,
    "district" TEXT,
    "village" TEXT,
    "profilePhotoUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'FARMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "deviceType" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmPlot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "village" TEXT NOT NULL,
    "area" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "irrigationType" "IrrigationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmPlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropDefinition" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameHi" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CropDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropSeason" (
    "id" TEXT NOT NULL,
    "farmPlotId" TEXT NOT NULL,
    "cropDefinitionId" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "sowingDate" DATE NOT NULL,
    "currentStage" TEXT NOT NULL,
    "status" "CropSeasonStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CropSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropStageRule" (
    "id" TEXT NOT NULL,
    "cropDefinitionId" TEXT NOT NULL,
    "stageKey" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelHi" TEXT NOT NULL,
    "startDay" INTEGER NOT NULL,
    "endDay" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "CropStageRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" TEXT NOT NULL,
    "cropDefinitionId" TEXT NOT NULL,
    "stageKey" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleHi" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionHi" TEXT NOT NULL,
    "dueDayOffset" INTEGER NOT NULL,
    "taskType" "TaskType" NOT NULL,
    "priority" "TaskPriority" NOT NULL,
    "weatherCondition" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropTask" (
    "id" TEXT NOT NULL,
    "cropSeasonId" TEXT NOT NULL,
    "taskTemplateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "taskType" "TaskType" NOT NULL,
    "priority" "TaskPriority" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "generatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CropTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherSnapshot" (
    "id" TEXT NOT NULL,
    "farmPlotId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "forecastDate" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiseaseReport" (
    "id" TEXT NOT NULL,
    "cropSeasonId" TEXT NOT NULL,
    "image1Url" TEXT,
    "image2Url" TEXT,
    "voiceNoteUrl" TEXT,
    "userNote" TEXT,
    "predictedIssue" TEXT,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recommendation" TEXT NOT NULL,
    "escalationRequired" BOOLEAN NOT NULL DEFAULT false,
    "status" "DiseaseReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiseaseReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketRecord" (
    "id" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "mandiName" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "priceMin" DOUBLE PRECISION NOT NULL,
    "priceMax" DOUBLE PRECISION NOT NULL,
    "priceModal" DOUBLE PRECISION NOT NULL,
    "recordDate" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scheme" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleHi" TEXT,
    "description" TEXT NOT NULL,
    "descriptionHi" TEXT,
    "category" TEXT NOT NULL,
    "applicableState" TEXT NOT NULL,
    "officialLink" TEXT NOT NULL,
    "language" "PreferredLanguage" NOT NULL DEFAULT 'en',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cropSeasonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "alertType" "AlertType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "OtpChallenge_phone_createdAt_idx" ON "OtpChallenge"("phone", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "FarmPlot_userId_createdAt_idx" ON "FarmPlot"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CropDefinition_slug_key" ON "CropDefinition"("slug");

-- CreateIndex
CREATE INDEX "CropSeason_farmPlotId_status_idx" ON "CropSeason"("farmPlotId", "status");

-- CreateIndex
CREATE INDEX "CropStageRule_cropDefinitionId_sortOrder_idx" ON "CropStageRule"("cropDefinitionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CropStageRule_cropDefinitionId_stageKey_key" ON "CropStageRule"("cropDefinitionId", "stageKey");

-- CreateIndex
CREATE INDEX "TaskTemplate_cropDefinitionId_stageKey_dueDayOffset_idx" ON "TaskTemplate"("cropDefinitionId", "stageKey", "dueDayOffset");

-- CreateIndex
CREATE INDEX "CropTask_cropSeasonId_dueDate_status_idx" ON "CropTask"("cropSeasonId", "dueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CropTask_cropSeasonId_taskTemplateId_dueDate_key" ON "CropTask"("cropSeasonId", "taskTemplateId", "dueDate");

-- CreateIndex
CREATE INDEX "WeatherSnapshot_farmPlotId_forecastDate_idx" ON "WeatherSnapshot"("farmPlotId", "forecastDate");

-- CreateIndex
CREATE INDEX "DiseaseReport_cropSeasonId_createdAt_idx" ON "DiseaseReport"("cropSeasonId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "MarketRecord_cropName_state_district_recordDate_idx" ON "MarketRecord"("cropName", "state", "district", "recordDate" DESC);

-- CreateIndex
CREATE INDEX "Scheme_applicableState_category_active_idx" ON "Scheme"("applicableState", "category", "active");

-- CreateIndex
CREATE INDEX "Alert_userId_createdAt_idx" ON "Alert"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Alert_cropSeasonId_alertType_idx" ON "Alert"("cropSeasonId", "alertType");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmPlot" ADD CONSTRAINT "FarmPlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropSeason" ADD CONSTRAINT "CropSeason_cropDefinitionId_fkey" FOREIGN KEY ("cropDefinitionId") REFERENCES "CropDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropSeason" ADD CONSTRAINT "CropSeason_farmPlotId_fkey" FOREIGN KEY ("farmPlotId") REFERENCES "FarmPlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropStageRule" ADD CONSTRAINT "CropStageRule_cropDefinitionId_fkey" FOREIGN KEY ("cropDefinitionId") REFERENCES "CropDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_cropDefinitionId_fkey" FOREIGN KEY ("cropDefinitionId") REFERENCES "CropDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropTask" ADD CONSTRAINT "CropTask_cropSeasonId_fkey" FOREIGN KEY ("cropSeasonId") REFERENCES "CropSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropTask" ADD CONSTRAINT "CropTask_taskTemplateId_fkey" FOREIGN KEY ("taskTemplateId") REFERENCES "TaskTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeatherSnapshot" ADD CONSTRAINT "WeatherSnapshot_farmPlotId_fkey" FOREIGN KEY ("farmPlotId") REFERENCES "FarmPlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiseaseReport" ADD CONSTRAINT "DiseaseReport_cropSeasonId_fkey" FOREIGN KEY ("cropSeasonId") REFERENCES "CropSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_cropSeasonId_fkey" FOREIGN KEY ("cropSeasonId") REFERENCES "CropSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

