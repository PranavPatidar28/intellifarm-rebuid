import { useEffect, useState } from 'react';
import {
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { Stack, useLocalSearchParams } from 'expo-router';
import {
  Battery,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Clock3,
  Droplets,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SignalZero,
  Thermometer,
  Wind,
} from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';

import { AdvancedSettingsAccordion } from '@/components/advanced-settings-accordion';
import { Button } from '@/components/button';
import { GlassPanel } from '@/components/glass-panel';
import { InsetCard } from '@/components/inset-card';
import { MotionPressable } from '@/components/motion-pressable';
import { PageShell } from '@/components/page-shell';
import { TelemetryChartCard } from '@/components/telemetry-chart-card';
import { TextField } from '@/components/text-field';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import type {
  DeviceSettingsResponse,
  FarmDeviceResponse,
  PumpCommandResponse,
} from '@/lib/api-types';
import { formatRelativeTime } from '@/lib/format';
import { palette, radii, spacing, typography } from '@/theme/tokens';

type PumpControlMode = NonNullable<
  FarmDeviceResponse['device']
>['pumpControlMode'];

export default function DeviceDetailRoute() {
  const params = useLocalSearchParams<{ farmPlotId: string }>();
  const { token } = useSession();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const [pumpModeBusy, setPumpModeBusy] = useState<PumpControlMode | null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [lowThreshold, setLowThreshold] = useState('');
  const [recoveryThreshold, setRecoveryThreshold] = useState('');

  const deviceQueryKey = ['farm-device', token, params.farmPlotId];
  const heroStacked = width < 390;

  const deviceQuery = useCachedQuery({
    cacheKey: `farm-device:${params.farmPlotId}`,
    queryKey: deviceQueryKey,
    enabled: Boolean(token && params.farmPlotId),
    refetchInterval: 1_000,
    queryFn: () =>
      apiGet<FarmDeviceResponse>(`/farm-plots/${params.farmPlotId}/device`, token),
  });

  const deviceResponse = deviceQuery.data;
  const device = deviceResponse?.device ?? null;
  const telemetry = deviceResponse?.telemetry ?? [];
  const pumpEvents = deviceResponse?.pumpEvents ?? [];
  const latestReading = device?.latestReading ?? null;
  const selectedMode =
    pumpModeBusy ?? device?.pendingCommand?.targetMode ?? device?.pumpControlMode ?? null;
  const lastSeenAt =
    device?.lastSeenAt ?? device?.lastTelemetryAt ?? latestReading?.recordedAt ?? null;
  const visibleEvents = pumpEvents.slice(0, 4);

  useEffect(() => {
    if (!device) {
      return;
    }

    setAutoEnabled(device.autoIrrigationEnabled);
    setLowThreshold(String(Math.round(device.thresholds.lowThreshold)));
    setRecoveryThreshold(String(Math.round(device.thresholds.recoveryThreshold)));
  }, [device]);

  const handlePumpModeChange = async (targetMode: PumpControlMode) => {
    if (!token || !params.farmPlotId) {
      return;
    }

    setMessage(null);
    setPumpModeBusy(targetMode);

    try {
      const response = await apiPost<PumpCommandResponse>(
        `/farm-plots/${params.farmPlotId}/pump/commands`,
        { targetMode },
        token,
      );

      queryClient.setQueryData(deviceQueryKey, (oldData: any) => {
        if (!oldData) {
          return oldData;
        }

        return {
          ...oldData,
          device: response.deviceOverview,
        };
      });
    } catch {
      setMessage('Unable to update the pump right now.');
    } finally {
      setPumpModeBusy(null);
    }
  };

  const handleSaveSettings = async () => {
    if (!token || !params.farmPlotId) {
      return;
    }

    const nextLow = Number.parseFloat(lowThreshold);
    const nextRecovery = Number.parseFloat(recoveryThreshold);

    if (!Number.isFinite(nextLow) || !Number.isFinite(nextRecovery)) {
      setMessage('Enter valid thresholds.');
      return;
    }

    if (nextLow < 0 || nextLow > 100 || nextRecovery < 0 || nextRecovery > 100) {
      setMessage('Thresholds must stay between 0 and 100.');
      return;
    }

    if (nextLow >= nextRecovery) {
      setMessage('Recovery threshold must be greater than start threshold.');
      return;
    }

    setMessage(null);
    setSettingsBusy(true);

    try {
      await apiPatch<DeviceSettingsResponse>(
        `/farm-plots/${params.farmPlotId}/device/settings`,
        {
          autoIrrigationEnabled: autoEnabled,
          moistureLowThreshold: nextLow,
          moistureRecoveryThreshold: nextRecovery,
        },
        token,
      );
      await deviceQuery.refetch();
      setMessage('Automation saved.');
    } catch {
      setMessage('Unable to save settings right now.');
    } finally {
      setSettingsBusy(false);
    }
  };

  const automationSummary = device
    ? `${autoEnabled ? 'Auto on' : 'Auto off'} | Start ${lowThreshold || Math.round(device.thresholds.lowThreshold)}% | Recover ${recoveryThreshold || Math.round(device.thresholds.recoveryThreshold)}%`
    : 'No device linked';

  return (
    <>
      <Stack.Screen options={{ title: 'Smart irrigation' }} />
      <PageShell
        eyebrow="Smart irrigation"
        title={device?.name ?? 'Smart irrigation'}
        heroTone="weather"
        hero={
          <GlassPanel padding={spacing.md}>
            {device ? (
              <View style={{ gap: spacing.md }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: spacing.sm,
                  }}
                >
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: spacing.xs,
                      }}
                    >
                      <HeroPill
                        label={describeStatus(device.status)}
                        backgroundColor={getStatusBackground(device.status)}
                        color={getStatusColor(device.status)}
                      />
                      <HeroPill
                        label={describePumpState(device.pumpState)}
                        backgroundColor={
                          device.pumpState === 'ON'
                            ? palette.mustardSoft
                            : device.pumpState === 'FAULT'
                              ? palette.terracottaSoft
                              : 'rgba(255,255,255,0.82)'
                        }
                        color={
                          device.pumpState === 'ON'
                            ? palette.mustard
                            : device.pumpState === 'FAULT'
                              ? palette.terracotta
                            : palette.inkSoft
                        }
                      />
                    </View>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: heroStacked ? 'column' : 'row',
                    gap: spacing.md,
                    alignItems: heroStacked ? 'stretch' : 'flex-end',
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={{
                        color: palette.inkMuted,
                        fontFamily: typography.bodyStrong,
                        fontSize: 11,
                        textTransform: 'uppercase',
                      }}
                    >
                      Soil moisture
                    </Text>
                    <Text
                      style={{
                        color:
                          latestReading &&
                          latestReading.soilMoisturePercent <= device.thresholds.lowThreshold
                            ? palette.terracotta
                            : palette.ink,
                        fontFamily: typography.displayBold,
                        fontSize: 42,
                        lineHeight: 46,
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {latestReading
                        ? `${Math.round(latestReading.soilMoisturePercent)}%`
                        : '--'}
                    </Text>
                    <Text
                      style={{
                        color: palette.inkSoft,
                        fontFamily: typography.bodyRegular,
                        fontSize: 12,
                      }}
                    >
                      {describeMoistureStatus(
                        latestReading?.soilMoisturePercent ?? null,
                        device.thresholds.lowThreshold,
                        device.thresholds.recoveryThreshold,
                      )}
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: heroStacked ? 'row' : 'column',
                      gap: spacing.sm,
                    }}
                  >
                    <CompanionMetric
                      icon={<Thermometer color={palette.mustard} size={16} />}
                      value={
                        latestReading ? `${Math.round(latestReading.temperatureC)}°C` : '--'
                      }
                    />
                    <CompanionMetric
                      icon={<Wind color={palette.inkSoft} size={16} />}
                      value={
                        latestReading ? `${Math.round(latestReading.humidityPercent)}%` : '--'
                      }
                    />
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing.xs,
                  }}
                >
                  {latestReading?.batteryPercent != null ? (
                    <MetaChip
                      icon={getBatteryIcon(latestReading.batteryPercent)}
                      label={`${Math.round(latestReading.batteryPercent)}%`}
                    />
                  ) : null}
                  {latestReading?.signalStrength != null ? (
                    <MetaChip
                      icon={getSignalIcon(latestReading.signalStrength)}
                      label={`${Math.round(latestReading.signalStrength)} dBm`}
                    />
                  ) : null}
                  {lastSeenAt ? (
                    <MetaChip
                      icon={<Clock3 color={palette.inkSoft} size={15} />}
                      label={formatRelativeTime(lastSeenAt)}
                    />
                  ) : null}
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.xxs,
                    padding: spacing.xxs,
                    borderRadius: radii.pill,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: 'rgba(30,42,34,0.10)',
                    backgroundColor: 'rgba(255,255,255,0.68)',
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.xxs,
                      paddingLeft: spacing.sm,
                      paddingRight: spacing.xxs,
                    }}
                  >
                    <Droplets color={palette.sky} size={14} />
                    <Text
                      style={{
                        color: palette.ink,
                        fontFamily: typography.bodyStrong,
                        fontSize: 12,
                      }}
                    >
                      Pump
                    </Text>
                    <View
                      style={{
                        width: 1,
                        height: 22,
                        backgroundColor: 'rgba(30,42,34,0.15)',
                        marginLeft: spacing.xxs,
                      }}
                    />
                  </View>
                  {(['AUTO', 'FORCE_ON', 'FORCE_OFF'] as const).map((mode) => (
                    <SegmentedChoiceButton
                      key={mode}
                      label={
                        mode === 'AUTO' ? 'Auto' : mode === 'FORCE_ON' ? 'On' : 'Off'
                      }
                      active={selectedMode === mode}
                      disabled={Boolean(pumpModeBusy)}
                      onPress={() => void handlePumpModeChange(mode)}
                    />
                  ))}
                </View>

                {pumpModeBusy ? (
                  <Text
                    style={{
                      color: palette.inkSoft,
                      fontFamily: typography.bodyRegular,
                      fontSize: 12,
                    }}
                  >
                    Sending {describeCompactMode(pumpModeBusy).toLowerCase()} command...
                  </Text>
                ) : device.pendingCommand ? (
                  <Text
                    style={{
                      color: palette.inkSoft,
                      fontFamily: typography.bodyRegular,
                      fontSize: 12,
                    }}
                  >
                    Pending {describeCompactMode(device.pendingCommand.targetMode).toLowerCase()} command.
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={{ gap: spacing.xs }}>
                <Text
                  style={{
                    color: palette.ink,
                    fontFamily: typography.bodyStrong,
                    fontSize: 17,
                  }}
                >
                  No linked device
                </Text>
                <Text
                  style={{
                    color: palette.inkSoft,
                    fontFamily: typography.bodyRegular,
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  Connect a field node to unlock live control.
                </Text>
              </View>
            )}
          </GlassPanel>
        }
      >
        {message ? (
          <InlineBanner
            text={message}
            tone={message.includes('saved') ? 'feature' : 'alert'}
          />
        ) : null}

        {device ? (
          <>
            <TelemetryChartCard telemetry={telemetry} thresholds={device.thresholds} />

            <AdvancedSettingsAccordion
              title="Automation"
              summary={automationSummary}
            >
              <View style={{ gap: spacing.md }}>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: spacing.xxs,
                    padding: spacing.xxs,
                    borderRadius: radii.pill,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: palette.outline,
                    backgroundColor: palette.white,
                  }}
                >
                  <SegmentedChoiceButton
                    label="On"
                    active={autoEnabled}
                    disabled={!device || settingsBusy}
                    onPress={() => setAutoEnabled(true)}
                  />
                  <SegmentedChoiceButton
                    label="Off"
                    active={!autoEnabled}
                    disabled={!device || settingsBusy}
                    onPress={() => setAutoEnabled(false)}
                  />
                </View>

                <TextField
                  label="Start below"
                  value={lowThreshold}
                  onChangeText={setLowThreshold}
                  keyboardType="numeric"
                />
                <TextField
                  label="Recover above"
                  value={recoveryThreshold}
                  onChangeText={setRecoveryThreshold}
                  keyboardType="numeric"
                />

                <Button
                  label={settingsBusy ? 'Saving...' : 'Save'}
                  onPress={() => void handleSaveSettings()}
                  loading={settingsBusy}
                  disabled={!device}
                />
              </View>
            </AdvancedSettingsAccordion>

            <InsetCard>
              <View style={{ gap: spacing.sm }}>
                <Text
                  style={{
                    color: palette.ink,
                    fontFamily: typography.bodyStrong,
                    fontSize: 16,
                  }}
                >
                  Recent activity
                </Text>

                {visibleEvents.length ? (
                  visibleEvents.map((event) => (
                    <CompactEventRow
                      key={event.id}
                      title={describeEventTitle(event.source, event.nextState)}
                      detail={
                        event.source === 'MANUAL_COMMAND' ? null : event.reason.trim() || null
                      }
                      timeLabel={formatRelativeTime(event.createdAt)}
                    />
                  ))
                ) : (
                  <EmptyCopy text="No pump activity yet." />
                )}
              </View>
            </InsetCard>
          </>
        ) : (
          <InsetCard tone="soft">
            <EmptyCopy text="Live telemetry will appear here once a device is linked." />
          </InsetCard>
        )}
      </PageShell>
    </>
  );
}

function HeroPill({
  label,
  backgroundColor,
  color,
}: {
  label: string;
  backgroundColor: string;
  color: string;
}) {
  return (
    <View
      style={{
        borderRadius: radii.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs + 1,
        backgroundColor,
      }}
    >
      <Text
        style={{
          color,
          fontFamily: typography.bodyStrong,
          fontSize: 11,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function CompanionMetric({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: string;
}) {
  return (
    <View
      style={{
        minWidth: 110,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        backgroundColor: 'rgba(255,255,255,0.72)',
        borderWidth: 1,
        borderColor: 'rgba(30,42,34,0.10)',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
      }}
    >
      {icon}
      <Text
        style={{
          color: palette.ink,
          fontFamily: typography.bodyStrong,
          fontSize: 14,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function MetaChip({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: radii.pill,
        borderCurve: 'continuous',
        backgroundColor: 'rgba(255,255,255,0.72)',
        borderWidth: 1,
        borderColor: 'rgba(30,42,34,0.10)',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
      }}
    >
      {icon}
      <Text
        style={{
          color: palette.inkSoft,
          fontFamily: typography.bodyStrong,
          fontSize: 11,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function SegmentedChoiceButton({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <MotionPressable
      disabled={disabled}
      onPress={onPress}
      style={{ flex: 1 }}
      contentStyle={{
        minHeight: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.pill,
        borderCurve: 'continuous',
        backgroundColor: active ? palette.leafDark : 'transparent',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
      }}
    >
      <Text
        style={{
          color: active ? palette.white : palette.inkSoft,
          fontFamily: typography.bodyStrong,
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </MotionPressable>
  );
}

function InlineBanner({
  text,
  tone,
}: {
  text: string;
  tone: 'feature' | 'alert';
}) {
  return (
    <InsetCard tone={tone} padding={12}>
      <Text
        style={{
          color: tone === 'feature' ? palette.leafDark : palette.terracotta,
          fontFamily: typography.bodyRegular,
          fontSize: 12,
          lineHeight: 18,
        }}
      >
        {text}
      </Text>
    </InsetCard>
  );
}

function CompactEventRow({
  title,
  detail,
  timeLabel,
}: {
  title: string;
  detail: string | null;
  timeLabel: string;
}) {
  return (
    <View
      style={{
        gap: detail ? 4 : 0,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: palette.outline,
        backgroundColor: palette.white,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <Text
          style={{
            flex: 1,
            color: palette.ink,
            fontFamily: typography.bodyStrong,
            fontSize: 13,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: palette.inkMuted,
            fontFamily: typography.bodyRegular,
            fontSize: 11,
          }}
        >
          {timeLabel}
        </Text>
      </View>
      {detail ? (
        <Text
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

function EmptyCopy({ text }: { text: string }) {
  return (
    <Text
      style={{
        color: palette.inkSoft,
        fontFamily: typography.bodyRegular,
        fontSize: 12,
        lineHeight: 18,
      }}
    >
      {text}
    </Text>
  );
}

function describeCompactMode(mode: PumpControlMode) {
  switch (mode) {
    case 'AUTO':
      return 'Auto';
    case 'FORCE_ON':
      return 'On';
    case 'FORCE_OFF':
      return 'Off';
    default:
      return 'Auto';
  }
}

function describePumpState(state: 'ON' | 'OFF' | 'FAULT') {
  switch (state) {
    case 'ON':
      return 'Pump on';
    case 'OFF':
      return 'Pump off';
    case 'FAULT':
      return 'Pump fault';
    default:
      return 'Pump off';
  }
}

function describeStatus(status: 'ONLINE' | 'OFFLINE' | 'FAULT') {
  switch (status) {
    case 'ONLINE':
      return 'Online';
    case 'OFFLINE':
      return 'Offline';
    case 'FAULT':
      return 'Fault';
    default:
      return 'Offline';
  }
}

function describeMoistureStatus(
  moisture: number | null,
  lowThreshold: number,
  recoveryThreshold: number,
) {
  if (moisture == null) {
    return 'Waiting for telemetry';
  }

  if (moisture <= lowThreshold) {
    return 'Dry zone';
  }

  if (moisture >= recoveryThreshold) {
    return 'Recovered';
  }

  return 'In range';
}

function describeEventTitle(
  source: 'AUTO_RULE' | 'MANUAL_COMMAND' | 'DEVICE_FAILSAFE' | 'DEVICE_LOCAL',
  nextState: 'ON' | 'OFF' | 'FAULT',
) {
  const stateLabel =
    nextState === 'ON' ? 'pump on' : nextState === 'OFF' ? 'pump off' : 'pump fault';

  switch (source) {
    case 'AUTO_RULE':
      return `Auto ${stateLabel}`;
    case 'MANUAL_COMMAND':
      return `Manual ${stateLabel}`;
    case 'DEVICE_FAILSAFE':
      return `Failsafe ${stateLabel}`;
    case 'DEVICE_LOCAL':
      return `Device ${stateLabel}`;
    default:
      return stateLabel;
  }
}

function getStatusBackground(status: 'ONLINE' | 'OFFLINE' | 'FAULT') {
  switch (status) {
    case 'ONLINE':
      return palette.leafMist;
    case 'OFFLINE':
      return 'rgba(255,255,255,0.82)';
    case 'FAULT':
      return palette.terracottaSoft;
    default:
      return 'rgba(255,255,255,0.82)';
  }
}

function getStatusColor(status: 'ONLINE' | 'OFFLINE' | 'FAULT') {
  switch (status) {
    case 'ONLINE':
      return palette.leafDark;
    case 'OFFLINE':
      return palette.inkSoft;
    case 'FAULT':
      return palette.terracotta;
    default:
      return palette.inkSoft;
  }
}

function getBatteryIcon(percent: number) {
  if (percent <= 20) {
    return <BatteryLow color={palette.terracotta} size={15} />;
  }

  if (percent <= 55) {
    return <BatteryMedium color={palette.mustard} size={15} />;
  }

  if (percent <= 80) {
    return <Battery color={palette.leafDark} size={15} />;
  }

  return <BatteryFull color={palette.leafDark} size={15} />;
}

function getSignalIcon(signalStrength: number) {
  if (signalStrength <= -100) {
    return <SignalZero color={palette.terracotta} size={15} />;
  }

  if (signalStrength <= -90) {
    return <SignalLow color={palette.mustard} size={15} />;
  }

  if (signalStrength <= -75) {
    return <SignalMedium color={palette.leafDark} size={15} />;
  }

  return <SignalHigh color={palette.leafDark} size={15} />;
}
