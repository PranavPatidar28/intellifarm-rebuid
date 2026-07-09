import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import {
  Cpu,
  Droplets,
  ShieldAlert,
  Thermometer,
  Wind,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { MotionPressable } from '@/components/motion-pressable';
import type { DashboardWeeklyResponse } from '@/lib/api-types';
import {
  gradients,
  palette,
  radii,
  semanticColors,
  shadow,
  spacing,
  typography,
} from '@/theme/tokens';

type DeviceOverview = DashboardWeeklyResponse['deviceOverview'];
type PumpControlMode = NonNullable<DeviceOverview>['pumpControlMode'];

type IrrigationDeviceCardProps = {
  device: DeviceOverview;
  busyMode?: PumpControlMode | null;
  message?: string | null;
  onChangeMode?: (mode: PumpControlMode) => void;
  onOpenDetails?: () => void;
};

export function IrrigationDeviceCard({
  device,
  busyMode,
  message,
  onChangeMode,
  onOpenDetails,
}: IrrigationDeviceCardProps) {
  if (!device) {
    return (
      <MotionPressable
        onPress={onOpenDetails}
        style={{
          borderRadius: radii.xl,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: palette.outline,
          backgroundColor: palette.white,
          padding: spacing.lg,
          gap: spacing.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: radii.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: palette.skySoft,
            }}
          >
            <Droplets color={palette.sky} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: palette.ink,
                fontFamily: typography.bodyStrong,
                fontSize: 16,
              }}
            >
              Smart irrigation
            </Text>
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              Link a field device to see live moisture, pump status, and irrigation control.
            </Text>
          </View>
        </View>
      </MotionPressable>
    );
  }

  const latestReading = device.latestReading;
  const cardColors =
    device.status === 'FAULT'
      ? gradients.cropHealth
      : device.status === 'OFFLINE'
        ? gradients.neutralGlass
        : device.pumpState === 'ON'
          ? gradients.weatherHeat
          : gradients.assistantGlow;
  const selectedMode =
    busyMode ?? device.pendingCommand?.targetMode ?? device.pumpControlMode;

  return (
    <View
      style={{
        overflow: 'hidden',
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        boxShadow: shadow.glow,
      }}
    >
      <LinearGradient
        colors={[...cardColors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          padding: spacing.md,
          gap: spacing.sm,
        }}
      >
        <MotionPressable onPress={onOpenDetails}>
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radii.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    device.status === 'FAULT'
                      ? semanticColors.dangerSoft
                      : device.pumpState === 'ON'
                        ? semanticColors.warningSoft
                        : semanticColors.infoSoft,
                }}
              >
                {device.status === 'FAULT' ? (
                  <ShieldAlert color={semanticColors.danger} size={20} />
                ) : (
                  <Cpu
                    color={
                      device.pumpState === 'ON'
                        ? semanticColors.warning
                        : semanticColors.info
                    }
                    size={20}
                  />
                )}
              </View>

              <View
                style={{
                  flex: 1,
                  minWidth: 0,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing.sm,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    color: palette.ink,
                    fontFamily: typography.bodyStrong,
                    fontSize: 16,
                  }}
                >
                  {device.name}
                </Text>
                <StatusPill
                  label={describeStatus(device.status)}
                  backgroundColor={
                    device.status === 'FAULT'
                      ? semanticColors.dangerSoft
                      : device.status === 'ONLINE'
                        ? semanticColors.successSoft
                        : 'rgba(255,255,255,0.88)'
                  }
                  color={
                    device.status === 'FAULT'
                      ? semanticColors.danger
                      : device.status === 'ONLINE'
                        ? semanticColors.success
                        : palette.inkSoft
                  }
                />
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                gap: spacing.xs,
              }}
            >
              <MetricChip
                icon={<Droplets color={palette.sky} size={15} />}
                value={
                  latestReading
                    ? `${Math.round(latestReading.soilMoisturePercent)}%`
                    : '--'
                }
                emphasis={
                  latestReading &&
                  latestReading.soilMoisturePercent <= device.thresholds.lowThreshold
                    ? semanticColors.danger
                    : palette.ink
                }
              />
              <MetricChip
                icon={<Thermometer color={palette.mustard} size={15} />}
                value={latestReading ? `${Math.round(latestReading.temperatureC)}°C` : '--'}
              />
              <MetricChip
                icon={<Wind color={palette.inkSoft} size={15} />}
                value={latestReading ? `${Math.round(latestReading.humidityPercent)}%` : '--'}
              />
            </View>
          </View>
        </MotionPressable>

        <View
          style={{
            gap: spacing.xs,
            paddingTop: spacing.xs,
            borderTopWidth: 1,
            borderColor: 'rgba(30,42,34,0.08)',
          }}
        >
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
              backgroundColor: 'rgba(255,255,255,0.6)',
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
              <SegmentedModeButton
                key={mode}
                label={
                  mode === 'AUTO'
                    ? 'Auto'
                    : mode === 'FORCE_ON'
                      ? 'On'
                      : 'Off'
                }
                active={selectedMode === mode}
                disabled={!onChangeMode || Boolean(busyMode)}
                onPress={() => onChangeMode?.(mode)}
              />
            ))}
          </View>
          {busyMode ? (
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 12,
              }}
            >
              Sending {describeMode(busyMode).toLowerCase()} command...
            </Text>
          ) : null}
          {message ? (
            <Text
              style={{
                color: semanticColors.danger,
                fontFamily: typography.bodyRegular,
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              {message}
            </Text>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
}

function StatusPill({
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

function MetricChip({
  icon,
  value,
  emphasis = palette.ink,
}: {
  icon: ReactNode;
  value: string;
  emphasis?: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        borderRadius: radii.md,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: 'rgba(30,42,34,0.08)',
        backgroundColor: 'rgba(255,255,255,0.72)',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
      }}
    >
      {icon}
      <Text
        style={{
          color: emphasis,
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

function SegmentedModeButton({
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
        minHeight: 34,
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

function describeMode(mode: PumpControlMode): string {
  switch (mode) {
    case 'AUTO':
      return 'Auto';
    case 'FORCE_ON':
      return 'Manual On';
    case 'FORCE_OFF':
      return 'Manual Off';
    default:
      return 'Auto';
  }
}
