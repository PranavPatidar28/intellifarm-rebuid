import { DevicesService } from './devices.service';

describe('DevicesService', () => {
  const service = new DevicesService(
    {} as never,
    {
      publishInternalEvent: jest.fn(),
    } as never,
  );

  it('treats stale devices as offline', () => {
    const status = (
      service as unknown as {
        resolveDeviceStatus(input: {
          status: 'ONLINE' | 'OFFLINE' | 'FAULT';
          pumpState: 'ON' | 'OFF' | 'FAULT';
          lastSeenAt: Date | null;
        }): string;
      }
    ).resolveDeviceStatus({
      status: 'ONLINE',
      pumpState: 'OFF',
      lastSeenAt: new Date(Date.now() - 20 * 60_000),
    });

    expect(status).toBe('OFFLINE');
  });

  it('keeps fault devices in fault state regardless of telemetry age', () => {
    const status = (
      service as unknown as {
        resolveDeviceStatus(input: {
          status: 'ONLINE' | 'OFFLINE' | 'FAULT';
          pumpState: 'ON' | 'OFF' | 'FAULT';
          lastSeenAt: Date | null;
        }): string;
      }
    ).resolveDeviceStatus({
      status: 'FAULT',
      pumpState: 'OFF',
      lastSeenAt: new Date(),
    });

    expect(status).toBe('FAULT');
  });

  it('marks state changes from auto mode as auto-rule events', () => {
    const source = (
      service as unknown as {
        resolvePumpEventSource(
          commandWasApplied: boolean,
          controlMode: 'AUTO' | 'FORCE_ON' | 'FORCE_OFF',
        ): string;
      }
    ).resolvePumpEventSource(false, 'AUTO');

    expect(source).toBe('AUTO_RULE');
  });

  describe('issuePumpCommand confirmation gate', () => {
    type PumpCommandRow = {
      status: string;
      targetMode: string;
      appliedAt: Date | null;
    };

    function buildService(opts: {
      deviceStatus: 'ONLINE' | 'OFFLINE' | 'FAULT';
      pumpControlMode: 'AUTO' | 'FORCE_ON' | 'FORCE_OFF';
    }) {
      const farmDevice = {
        id: 'device-1',
        farmPlotId: 'plot-1',
        status: 'ONLINE',
        pumpState: 'OFF',
        pumpControlMode: opts.pumpControlMode,
        lastSeenAt: new Date(),
      };
      const created: { value: PumpCommandRow | null } = { value: null };

      const prisma = {
        farmDevice: {
          findUnique: jest.fn().mockResolvedValue(farmDevice),
          update: jest.fn().mockResolvedValue(farmDevice),
        },
        pumpCommand: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          create: jest.fn((arg: { data: PumpCommandRow }) => {
            created.value = arg.data;
            return Promise.resolve({ id: 'cmd-1', ...arg.data });
          }),
        },
      };

      const service = new DevicesService(
        prisma as never,
        { publishInternalEvent: jest.fn() } as never,
      );

      // Stub the collaborators that aren't under test here.
      jest
        .spyOn(
          service as unknown as { ensurePlotOwnership: () => Promise<void> },
          'ensurePlotOwnership',
        )
        .mockResolvedValue();
      jest
        .spyOn(
          service as unknown as {
            expirePendingCommands: () => Promise<void>;
          },
          'expirePendingCommands',
        )
        .mockResolvedValue();
      jest
        .spyOn(
          service as unknown as {
            getDeviceOverviewById: () => Promise<unknown>;
          },
          'getDeviceOverviewById',
        )
        .mockResolvedValue({});
      jest
        .spyOn(
          service as unknown as {
            resolveDeviceStatus: () => string;
          },
          'resolveDeviceStatus',
        )
        .mockReturnValue(opts.deviceStatus);

      return { service, prisma, created };
    }

    it('keeps a command PENDING until the device confirms when offline', async () => {
      const { service, prisma, created } = buildService({
        deviceStatus: 'OFFLINE',
        pumpControlMode: 'AUTO',
      });

      await service.issuePumpCommand('user-1', 'plot-1', {
        targetMode: 'FORCE_ON',
      });

      // Safety gate: an offline device must NOT be treated as having applied
      // the command — it sits PENDING with no appliedAt until telemetry confirms.
      expect(created.value?.status).toBe('PENDING');
      expect(created.value?.appliedAt).toBeNull();
      // The device's control mode must not flip optimistically.
      expect(prisma.farmDevice.update).not.toHaveBeenCalled();
    });

    it('keeps a command PENDING when the online device is in a different mode', async () => {
      const { service, created } = buildService({
        deviceStatus: 'ONLINE',
        pumpControlMode: 'FORCE_OFF',
      });

      await service.issuePumpCommand('user-1', 'plot-1', {
        targetMode: 'FORCE_ON',
      });

      expect(created.value?.status).toBe('PENDING');
      expect(created.value?.appliedAt).toBeNull();
    });

    it('marks APPLIED only when an online device already matches the target mode', async () => {
      const { service, prisma, created } = buildService({
        deviceStatus: 'ONLINE',
        pumpControlMode: 'FORCE_ON',
      });

      await service.issuePumpCommand('user-1', 'plot-1', {
        targetMode: 'FORCE_ON',
      });

      expect(created.value?.status).toBe('APPLIED');
      expect(created.value?.appliedAt).toBeInstanceOf(Date);
      expect(prisma.farmDevice.update).toHaveBeenCalled();
    });
  });
});
