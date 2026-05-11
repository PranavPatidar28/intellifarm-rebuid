-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'FAULT');

-- CreateEnum
CREATE TYPE "PumpState" AS ENUM ('ON', 'OFF', 'FAULT');

-- CreateEnum
CREATE TYPE "PumpControlMode" AS ENUM ('AUTO', 'FORCE_ON', 'FORCE_OFF');

-- CreateEnum
CREATE TYPE "PumpCommandStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'APPLIED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PumpEventSource" AS ENUM ('AUTO_RULE', 'MANUAL_COMMAND', 'DEVICE_FAILSAFE', 'DEVICE_LOCAL');

-- CreateTable
CREATE TABLE "FarmDevice" (
    "id" TEXT NOT NULL,
    "farmPlotId" TEXT NOT NULL,
    "hardwareId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'OFFLINE',
    "pumpState" "PumpState" NOT NULL DEFAULT 'OFF',
    "pumpControlMode" "PumpControlMode" NOT NULL DEFAULT 'AUTO',
    "autoIrrigationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "moistureLowThreshold" DOUBLE PRECISION NOT NULL DEFAULT 32,
    "moistureRecoveryThreshold" DOUBLE PRECISION NOT NULL DEFAULT 46,
    "lastSeenAt" TIMESTAMP(3),
    "lastTelemetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceTelemetry" (
    "id" TEXT NOT NULL,
    "farmDeviceId" TEXT NOT NULL,
    "temperatureC" DOUBLE PRECISION NOT NULL,
    "humidityPercent" DOUBLE PRECISION NOT NULL,
    "soilMoisturePercent" DOUBLE PRECISION NOT NULL,
    "pumpState" "PumpState" NOT NULL,
    "batteryPercent" DOUBLE PRECISION,
    "signalStrength" INTEGER,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceTelemetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PumpCommand" (
    "id" TEXT NOT NULL,
    "farmDeviceId" TEXT NOT NULL,
    "requestedByUserId" TEXT,
    "targetMode" "PumpControlMode" NOT NULL,
    "status" "PumpCommandStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PumpCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PumpEvent" (
    "id" TEXT NOT NULL,
    "farmDeviceId" TEXT NOT NULL,
    "source" "PumpEventSource" NOT NULL,
    "previousState" "PumpState",
    "nextState" "PumpState" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PumpEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FarmDevice_farmPlotId_key" ON "FarmDevice"("farmPlotId");

-- CreateIndex
CREATE UNIQUE INDEX "FarmDevice_hardwareId_key" ON "FarmDevice"("hardwareId");

-- CreateIndex
CREATE INDEX "FarmDevice_status_lastSeenAt_idx" ON "FarmDevice"("status", "lastSeenAt");

-- CreateIndex
CREATE INDEX "FarmDevice_farmPlotId_lastTelemetryAt_idx" ON "FarmDevice"("farmPlotId", "lastTelemetryAt");

-- CreateIndex
CREATE INDEX "DeviceTelemetry_farmDeviceId_recordedAt_idx" ON "DeviceTelemetry"("farmDeviceId", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "PumpCommand_farmDeviceId_status_issuedAt_idx" ON "PumpCommand"("farmDeviceId", "status", "issuedAt" DESC);

-- CreateIndex
CREATE INDEX "PumpCommand_requestedByUserId_issuedAt_idx" ON "PumpCommand"("requestedByUserId", "issuedAt" DESC);

-- CreateIndex
CREATE INDEX "PumpEvent_farmDeviceId_createdAt_idx" ON "PumpEvent"("farmDeviceId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "FarmDevice" ADD CONSTRAINT "FarmDevice_farmPlotId_fkey" FOREIGN KEY ("farmPlotId") REFERENCES "FarmPlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceTelemetry" ADD CONSTRAINT "DeviceTelemetry_farmDeviceId_fkey" FOREIGN KEY ("farmDeviceId") REFERENCES "FarmDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PumpCommand" ADD CONSTRAINT "PumpCommand_farmDeviceId_fkey" FOREIGN KEY ("farmDeviceId") REFERENCES "FarmDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PumpCommand" ADD CONSTRAINT "PumpCommand_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PumpEvent" ADD CONSTRAINT "PumpEvent_farmDeviceId_fkey" FOREIGN KEY ("farmDeviceId") REFERENCES "FarmDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
