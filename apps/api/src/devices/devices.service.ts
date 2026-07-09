import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  Prisma,
  type DeviceStatus,
  type PumpCommandStatus,
  type PumpControlMode,
  type PumpEventSource,
  type PumpState,
} from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const DEVICE_OFFLINE_THRESHOLD_SECONDS = 15;
const PUMP_COMMAND_TTL_MINUTES = 10;
const LOW_MOISTURE_ALERT_WINDOW_HOURS = 6;
const DEVICE_OFFLINE_ALERT_WINDOW_HOURS = 12;
const DEVICE_FAULT_ALERT_WINDOW_HOURS = 6;

type IngestTelemetryInput = {
  hardwareId: string;
  deviceName?: string;
  temperatureC: number;
  humidityPercent: number;
  soilMoisturePercent: number;
  pumpState: PumpState;
  pumpControlMode?: PumpControlMode;
  deviceStatus?: DeviceStatus;
  batteryPercent?: number;
  signalStrength?: number;
  recordedAt?: Date;
  rawPayload?: Record<string, unknown>;
};

type IssuePumpCommandInput = {
  targetMode: PumpControlMode;
  reason?: string;
};

type UpdateDeviceSettingsInput = {
  autoIrrigationEnabled?: boolean;
  moistureLowThreshold?: number;
  moistureRecoveryThreshold?: number;
};

@Injectable()
export class DevicesService {
  private liveTelemetryCache = new Map<string, any>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async ingestTelemetry(
    deviceApiKey: string | undefined,
    payload: IngestTelemetryInput,
  ) {
    const farmDevice = await this.prisma.farmDevice.findUnique({
      where: { hardwareId: payload.hardwareId },
      include: {
        farmPlot: {
          select: {
            id: true,
            userId: true,
            name: true,
          },
        },
        pumpCommands: {
          where: {
            status: 'PENDING',
            expiresAt: {
              gt: new Date(),
            },
          },
          orderBy: { issuedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!farmDevice) {
      throw new NotFoundException('Farm device is not registered');
    }

    // Optimization: API keys for devices should use simple string comparison
    // instead of bcrypt to avoid 100ms+ CPU lag per 1-second ingest.
    if (!deviceApiKey || deviceApiKey !== farmDevice.apiKeyHash) {
      throw new UnauthorizedException('Invalid device key');
    }

    // Fire and forget command expiration to prevent blocking the fast-path
    this.expirePendingCommands(farmDevice.id).catch((err) =>
      console.error(err),
    );

    const recordedAt = payload.recordedAt ?? new Date();
    const nextPumpState = payload.pumpState;
    const nextMode = payload.pumpControlMode ?? farmDevice.pumpControlMode;
    const nextStatus = this.resolveReportedStatus(
      payload.deviceStatus,
      nextPumpState,
    );
    const pendingCommand = farmDevice.pumpCommands[0] ?? null;
    const commandWasApplied =
      pendingCommand != null && pendingCommand.targetMode === nextMode;

    const timeSinceLastWrite = farmDevice.lastSeenAt
      ? (recordedAt.getTime() - farmDevice.lastSeenAt.getTime()) / 1000
      : Infinity;

    const stateChanged =
      farmDevice.pumpState !== nextPumpState ||
      farmDevice.pumpControlMode !== nextMode ||
      commandWasApplied;

    // Cache the live reading instantly for the dashboard
    this.liveTelemetryCache.set(farmDevice.id, {
      temperatureC: payload.temperatureC,
      humidityPercent: payload.humidityPercent,
      soilMoisturePercent: payload.soilMoisturePercent,
      pumpState: nextPumpState,
      batteryPercent: payload.batteryPercent ?? null,
      signalStrength: payload.signalStrength ?? null,
      recordedAt,
    });

    const activePendingCommand = commandWasApplied ? null : pendingCommand;

    if (timeSinceLastWrite < 5 && !stateChanged) {
      // Skip database write entirely if less than 5 seconds have passed
      return {
        accepted: true,
        recordedAt: recordedAt.toISOString(),
        deviceOverview: null,
        pendingCommand: activePendingCommand
          ? this.presentCommand(activePendingCommand)
          : null,
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.deviceTelemetry.create({
        data: {
          farmDeviceId: farmDevice.id,
          temperatureC: payload.temperatureC,
          humidityPercent: payload.humidityPercent,
          soilMoisturePercent: payload.soilMoisturePercent,
          pumpState: nextPumpState,
          batteryPercent: payload.batteryPercent,
          signalStrength: payload.signalStrength,
          recordedAt,
          rawPayload: this.createRawPayload(payload, recordedAt),
        },
      });

      await tx.farmDevice.update({
        where: { id: farmDevice.id },
        data: {
          name: payload.deviceName ?? farmDevice.name,
          status: nextStatus,
          pumpState: nextPumpState,
          pumpControlMode: nextMode,
          lastSeenAt: recordedAt,
          lastTelemetryAt: recordedAt,
        },
      });

      if (commandWasApplied && pendingCommand) {
        await tx.pumpCommand.update({
          where: { id: pendingCommand.id },
          data: {
            status: 'APPLIED',
            acknowledgedAt: recordedAt,
            appliedAt: recordedAt,
          },
        });
      }

      if (farmDevice.pumpState !== nextPumpState) {
        await tx.pumpEvent.create({
          data: {
            farmDeviceId: farmDevice.id,
            source: this.resolvePumpEventSource(commandWasApplied, nextMode),
            previousState: farmDevice.pumpState,
            nextState: nextPumpState,
            reason: this.resolvePumpEventReason(
              commandWasApplied,
              pendingCommand?.targetMode ?? null,
              nextMode,
            ),
            createdAt: recordedAt,
          },
        });
      }
    });

    // Fire and forget telemetry alerts to avoid blocking the HTTP response
    this.handleTelemetryAlerts({
      userId: farmDevice.farmPlot.userId,
      farmPlotId: farmDevice.farmPlot.id,
      deviceName: payload.deviceName ?? farmDevice.name,
      soilMoisturePercent: payload.soilMoisturePercent,
      moistureLowThreshold: farmDevice.moistureLowThreshold,
      pumpState: nextPumpState,
      status: nextStatus,
    }).catch((err) => console.error('Failed to handle telemetry alerts', err));

    return {
      accepted: true,
      recordedAt: recordedAt.toISOString(),
      deviceOverview: null, // Optimization: Omitted from ingest to save 4 DB queries. The ESP32 doesn't use this payload.
      pendingCommand: activePendingCommand
        ? this.presentCommand(activePendingCommand)
        : null,
    };
  }

  async getPlotDevice(userId: string, farmPlotId: string) {
    await this.ensurePlotOwnership(userId, farmPlotId);

    const farmDevice = await this.prisma.farmDevice.findUnique({
      where: { farmPlotId },
      select: { id: true },
    });

    if (!farmDevice) {
      return {
        device: null,
        telemetry: [],
        pumpEvents: [],
      };
    }

    const [deviceOverview, dbTelemetry, pumpEvents] = await Promise.all([
      this.getDeviceOverviewById(farmDevice.id),
      this.prisma.deviceTelemetry.findMany({
        where: { farmDeviceId: farmDevice.id },
        orderBy: { recordedAt: 'desc' },
        take: 24,
      }),
      this.prisma.pumpEvent.findMany({
        where: { farmDeviceId: farmDevice.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const cachedTelemetry = this.liveTelemetryCache.get(farmDevice.id);
    const telemetry = [...dbTelemetry];
    if (
      cachedTelemetry &&
      (!telemetry.length ||
        cachedTelemetry.recordedAt > telemetry[0].recordedAt)
    ) {
      telemetry.unshift({
        id: 'live-cache',
        farmDeviceId: farmDevice.id,
        rawPayload: {},
        createdAt: cachedTelemetry.recordedAt,
        ...cachedTelemetry,
      });
      if (telemetry.length > 24) telemetry.pop();
    }

    return {
      device: deviceOverview,
      telemetry: telemetry
        .reverse()
        .map((entry) => this.presentTelemetry(entry)),
      pumpEvents: pumpEvents.map((entry) => this.presentPumpEvent(entry)),
    };
  }

  async issuePumpCommand(
    userId: string,
    farmPlotId: string,
    payload: IssuePumpCommandInput,
  ) {
    await this.ensurePlotOwnership(userId, farmPlotId);

    const farmDevice = await this.prisma.farmDevice.findUnique({
      where: { farmPlotId },
    });

    if (!farmDevice) {
      throw new NotFoundException(
        'Smart irrigation device not found for this plot',
      );
    }

    await this.expirePendingCommands(farmDevice.id);

    const currentStatus = this.resolveDeviceStatus(farmDevice);
    const commandStatus: PumpCommandStatus =
      currentStatus !== 'OFFLINE' &&
      farmDevice.pumpControlMode === payload.targetMode
        ? 'APPLIED'
        : 'PENDING';
    const issuedAt = new Date();
    const expiresAt = addMinutes(issuedAt, PUMP_COMMAND_TTL_MINUTES);

    await this.prisma.pumpCommand.updateMany({
      where: {
        farmDeviceId: farmDevice.id,
        status: 'PENDING',
      },
      data: {
        status: 'EXPIRED',
      },
    });

    const command = await this.prisma.pumpCommand.create({
      data: {
        farmDeviceId: farmDevice.id,
        requestedByUserId: userId,
        targetMode: payload.targetMode,
        status: commandStatus,
        reason: payload.reason ?? describeTargetMode(payload.targetMode),
        issuedAt,
        acknowledgedAt: commandStatus === 'APPLIED' ? issuedAt : null,
        appliedAt: commandStatus === 'APPLIED' ? issuedAt : null,
        expiresAt,
      },
    });

    if (commandStatus === 'APPLIED') {
      await this.prisma.farmDevice.update({
        where: { id: farmDevice.id },
        data: {
          pumpControlMode: payload.targetMode,
        },
      });
    }

    const deviceOverview = await this.getDeviceOverviewById(farmDevice.id);

    return {
      command: this.presentCommand(command),
      deviceOverview,
    };
  }

  async updateDeviceSettings(
    userId: string,
    farmPlotId: string,
    payload: UpdateDeviceSettingsInput,
  ) {
    await this.ensurePlotOwnership(userId, farmPlotId);

    const farmDevice = await this.prisma.farmDevice.findUnique({
      where: { farmPlotId },
    });

    if (!farmDevice) {
      throw new NotFoundException(
        'Smart irrigation device not found for this plot',
      );
    }

    const nextLowThreshold =
      payload.moistureLowThreshold ?? farmDevice.moistureLowThreshold;
    const nextRecoveryThreshold =
      payload.moistureRecoveryThreshold ?? farmDevice.moistureRecoveryThreshold;

    if (nextLowThreshold >= nextRecoveryThreshold) {
      throw new BadRequestException(
        'Recovery threshold must be greater than low threshold',
      );
    }

    await this.prisma.farmDevice.update({
      where: { id: farmDevice.id },
      data: {
        autoIrrigationEnabled:
          payload.autoIrrigationEnabled ?? farmDevice.autoIrrigationEnabled,
        moistureLowThreshold: nextLowThreshold,
        moistureRecoveryThreshold: nextRecoveryThreshold,
      },
    });

    const deviceOverview = await this.getDeviceOverviewById(farmDevice.id);
    if (!deviceOverview) {
      throw new NotFoundException(
        'Smart irrigation device not found for this plot',
      );
    }

    return {
      deviceOverview,
    };
  }

  async getDashboardDeviceOverview(farmPlotId: string) {
    const farmDevice = await this.prisma.farmDevice.findUnique({
      where: { farmPlotId },
      select: { id: true },
    });

    if (!farmDevice) {
      return null;
    }

    return this.getDeviceOverviewById(farmDevice.id);
  }

  private async getDeviceOverviewById(farmDeviceId: string) {
    const [farmDevice, latestDbTelemetry, latestPumpEvent, pendingCommand] =
      await Promise.all([
        this.prisma.farmDevice.findUnique({
          where: { id: farmDeviceId },
        }),
        this.prisma.deviceTelemetry.findFirst({
          where: { farmDeviceId },
          orderBy: { recordedAt: 'desc' },
        }),
        this.prisma.pumpEvent.findFirst({
          where: { farmDeviceId },
          orderBy: { createdAt: 'desc' },
        }),
        this.findPendingCommand(farmDeviceId),
      ]);

    if (!farmDevice) {
      return null;
    }

    const cachedTelemetry = this.liveTelemetryCache.get(farmDeviceId);
    const latestTelemetry =
      cachedTelemetry && latestDbTelemetry
        ? cachedTelemetry.recordedAt > latestDbTelemetry.recordedAt
          ? cachedTelemetry
          : latestDbTelemetry
        : cachedTelemetry || latestDbTelemetry;

    const status = this.resolveDeviceStatus(farmDevice);

    return {
      deviceId: farmDevice.id,
      hardwareId: farmDevice.hardwareId,
      name: farmDevice.name,
      status,
      pumpState: farmDevice.pumpState,
      pumpControlMode: farmDevice.pumpControlMode,
      autoIrrigationEnabled: farmDevice.autoIrrigationEnabled,
      latestReading: latestTelemetry
        ? this.presentLatestReading(latestTelemetry)
        : null,
      thresholds: {
        lowThreshold: farmDevice.moistureLowThreshold,
        recoveryThreshold: farmDevice.moistureRecoveryThreshold,
      },
      lastPumpEvent: latestPumpEvent
        ? this.presentPumpEvent(latestPumpEvent)
        : null,
      pendingCommand: pendingCommand
        ? this.presentCommand(pendingCommand)
        : null,
      offlineMessage:
        status === 'OFFLINE'
          ? buildOfflineMessage(farmDevice.lastSeenAt)
          : null,
      lastSeenAt: farmDevice.lastSeenAt?.toISOString() ?? null,
      lastTelemetryAt: farmDevice.lastTelemetryAt?.toISOString() ?? null,
    };
  }

  private async ensurePlotOwnership(userId: string, farmPlotId: string) {
    const plot = await this.prisma.farmPlot.findFirst({
      where: {
        id: farmPlotId,
        userId,
      },
      select: { id: true },
    });

    if (!plot) {
      throw new NotFoundException('Farm plot not found');
    }
  }

  private async expirePendingCommands(farmDeviceId: string) {
    await this.prisma.pumpCommand.updateMany({
      where: {
        farmDeviceId,
        status: 'PENDING',
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });
  }

  private findPendingCommand(farmDeviceId: string) {
    return this.prisma.pumpCommand.findFirst({
      where: {
        farmDeviceId,
        status: 'PENDING',
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  @Cron('* * * * *')
  async markOfflineDevices() {
    const cutoff = addSeconds(new Date(), -DEVICE_OFFLINE_THRESHOLD_SECONDS);
    const staleDevices = await this.prisma.farmDevice.findMany({
      where: {
        lastSeenAt: {
          lt: cutoff,
        },
      },
      include: {
        farmPlot: {
          select: {
            id: true,
            userId: true,
            name: true,
          },
        },
      },
    });

    for (const device of staleDevices) {
      if (device.status !== 'FAULT') {
        await this.prisma.farmDevice.update({
          where: { id: device.id },
          data: { status: 'OFFLINE' },
        });
      }

      await this.createAlertIfMissing({
        userId: device.farmPlot.userId,
        title: 'Irrigation device is offline',
        message: `${device.name} has not synced recently for ${device.farmPlot.name}. Check power or connectivity.`,
        severity: 'MEDIUM',
        ctaRoute: `/device/${device.farmPlot.id}`,
        dedupeHours: DEVICE_OFFLINE_ALERT_WINDOW_HOURS,
      });
    }
  }

  private async handleTelemetryAlerts(params: {
    userId: string;
    farmPlotId: string;
    deviceName: string;
    soilMoisturePercent: number;
    moistureLowThreshold: number;
    pumpState: PumpState;
    status: DeviceStatus;
  }) {
    if (params.status === 'FAULT' || params.pumpState === 'FAULT') {
      await this.createAlertIfMissing({
        userId: params.userId,
        title: 'Irrigation device reported a fault',
        message: `${params.deviceName} reported a pump or relay fault. Inspect the controller before the next irrigation turn.`,
        severity: 'HIGH',
        ctaRoute: `/device/${params.farmPlotId}`,
        dedupeHours: DEVICE_FAULT_ALERT_WINDOW_HOURS,
      });
      return;
    }

    if (params.soilMoisturePercent <= params.moistureLowThreshold) {
      await this.createAlertIfMissing({
        userId: params.userId,
        title: 'Soil moisture is low',
        message: `${params.deviceName} reported soil moisture at ${Math.round(
          params.soilMoisturePercent,
        )}%. Review irrigation mode and pump status.`,
        severity: params.pumpState === 'ON' ? 'MEDIUM' : 'HIGH',
        ctaRoute: `/device/${params.farmPlotId}`,
        dedupeHours: LOW_MOISTURE_ALERT_WINDOW_HOURS,
      });
    }
  }

  private async createAlertIfMissing(params: {
    userId: string;
    title: string;
    message: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    ctaRoute: string;
    dedupeHours: number;
  }) {
    const thresholdDate = addHours(new Date(), -params.dedupeHours);
    const existing = await this.prisma.alert.findFirst({
      where: {
        userId: params.userId,
        title: params.title,
        ctaRoute: params.ctaRoute,
        createdAt: {
          gte: thresholdDate,
        },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return;
    }

    const alert = await this.prisma.alert.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        alertType: 'SYSTEM',
        severity: params.severity,
        ctaRoute: params.ctaRoute,
      },
    });

    this.notificationsService.publishInternalEvent('alert.created', {
      alertId: alert.id,
      userId: params.userId,
      ctaRoute: params.ctaRoute,
    });
  }

  private resolveReportedStatus(
    reportedStatus: DeviceStatus | undefined,
    pumpState: PumpState,
  ): DeviceStatus {
    if (reportedStatus === 'FAULT' || pumpState === 'FAULT') {
      return 'FAULT';
    }

    return 'ONLINE';
  }

  private resolveDeviceStatus(farmDevice: {
    status: DeviceStatus;
    pumpState: PumpState;
    lastSeenAt: Date | null;
  }): DeviceStatus {
    if (farmDevice.status === 'FAULT' || farmDevice.pumpState === 'FAULT') {
      return 'FAULT';
    }

    if (
      !farmDevice.lastSeenAt ||
      secondsSince(farmDevice.lastSeenAt) > DEVICE_OFFLINE_THRESHOLD_SECONDS
    ) {
      return 'OFFLINE';
    }

    return 'ONLINE';
  }

  private resolvePumpEventSource(
    commandWasApplied: boolean,
    controlMode: PumpControlMode,
  ): PumpEventSource {
    if (commandWasApplied) {
      return 'MANUAL_COMMAND';
    }

    if (controlMode === 'AUTO') {
      return 'AUTO_RULE';
    }

    return 'DEVICE_LOCAL';
  }

  private resolvePumpEventReason(
    commandWasApplied: boolean,
    targetMode: PumpControlMode | null,
    controlMode: PumpControlMode,
  ) {
    if (commandWasApplied && targetMode) {
      return `Pump state changed after ${describeTargetMode(targetMode).toLowerCase()}.`;
    }

    if (controlMode === 'AUTO') {
      return 'Automatic irrigation logic changed the pump state.';
    }

    return 'Pump state changed based on device telemetry.';
  }

  private createRawPayload(payload: IngestTelemetryInput, recordedAt: Date) {
    const fallbackPayload = {
      hardwareId: payload.hardwareId,
      deviceName: payload.deviceName ?? null,
      temperatureC: payload.temperatureC,
      humidityPercent: payload.humidityPercent,
      soilMoisturePercent: payload.soilMoisturePercent,
      pumpState: payload.pumpState,
      pumpControlMode: payload.pumpControlMode ?? null,
      deviceStatus: payload.deviceStatus ?? null,
      batteryPercent: payload.batteryPercent ?? null,
      signalStrength: payload.signalStrength ?? null,
      recordedAt: recordedAt.toISOString(),
    };

    return (payload.rawPayload ?? fallbackPayload) as Prisma.InputJsonValue;
  }

  private presentCommand(command: {
    id: string;
    targetMode: PumpControlMode;
    status: PumpCommandStatus;
    reason: string | null;
    issuedAt: Date;
    acknowledgedAt: Date | null;
    appliedAt: Date | null;
    expiresAt: Date;
  }) {
    return {
      id: command.id,
      targetMode: command.targetMode,
      status: command.status,
      reason: command.reason,
      issuedAt: command.issuedAt.toISOString(),
      acknowledgedAt: command.acknowledgedAt?.toISOString() ?? null,
      appliedAt: command.appliedAt?.toISOString() ?? null,
      expiresAt: command.expiresAt.toISOString(),
    };
  }

  private presentPumpEvent(event: {
    id: string;
    source: PumpEventSource;
    previousState: PumpState | null;
    nextState: PumpState;
    reason: string;
    createdAt: Date;
  }) {
    return {
      id: event.id,
      source: event.source,
      previousState: event.previousState,
      nextState: event.nextState,
      reason: event.reason,
      createdAt: event.createdAt.toISOString(),
    };
  }

  private presentTelemetry(entry: {
    id: string;
    temperatureC: number;
    humidityPercent: number;
    soilMoisturePercent: number;
    pumpState: PumpState;
    batteryPercent: number | null;
    signalStrength: number | null;
    recordedAt: Date;
  }) {
    return {
      id: entry.id,
      temperatureC: entry.temperatureC,
      humidityPercent: entry.humidityPercent,
      soilMoisturePercent: entry.soilMoisturePercent,
      pumpState: entry.pumpState,
      batteryPercent: entry.batteryPercent,
      signalStrength: entry.signalStrength,
      recordedAt: entry.recordedAt.toISOString(),
    };
  }

  private presentLatestReading(entry: {
    temperatureC: number;
    humidityPercent: number;
    soilMoisturePercent: number;
    pumpState: PumpState;
    batteryPercent: number | null;
    signalStrength: number | null;
    recordedAt: Date;
  }) {
    return {
      temperatureC: entry.temperatureC,
      humidityPercent: entry.humidityPercent,
      soilMoisturePercent: entry.soilMoisturePercent,
      pumpState: entry.pumpState,
      batteryPercent: entry.batteryPercent,
      signalStrength: entry.signalStrength,
      recordedAt: entry.recordedAt.toISOString(),
    };
  }
}

function secondsSince(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / 1000);
}

function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60_000);
}

function buildOfflineMessage(lastSeenAt: Date | null) {
  if (!lastSeenAt) {
    return 'This device has not reported any telemetry yet.';
  }

  const idleSeconds = secondsSince(lastSeenAt);
  if (idleSeconds < 60) {
    return `No device update received for ${idleSeconds} seconds.`;
  }

  const idleMinutes = Math.floor(idleSeconds / 60);
  return `No device update received for ${idleMinutes} minute${idleMinutes === 1 ? '' : 's'}.`;
}

function describeTargetMode(targetMode: PumpControlMode): string {
  switch (targetMode) {
    case 'AUTO':
      return 'Auto mode';
    case 'FORCE_ON':
      return 'Manual pump on';
    case 'FORCE_OFF':
      return 'Manual pump off';
    default:
      return 'Auto mode';
  }
}
