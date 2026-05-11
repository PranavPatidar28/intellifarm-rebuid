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
});
