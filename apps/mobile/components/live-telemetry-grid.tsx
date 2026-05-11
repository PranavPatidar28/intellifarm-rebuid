import { Text, View } from 'react-native';

import {
  Battery,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Droplets,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SignalZero,
  Thermometer,
  Wind,
} from 'lucide-react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';
import type { FarmDeviceResponse } from '@/lib/api-types';

interface LiveTelemetryGridProps {
  latestReading: NonNullable<FarmDeviceResponse['device']>['latestReading'] | null;
  lowThreshold?: number;
}

export function LiveTelemetryGrid({
  latestReading,
  lowThreshold = 30,
}: LiveTelemetryGridProps) {
  const items = [
    {
      key: 'moisture',
      icon: <Droplets size={16} color={palette.sky} />,
      value: latestReading ? `${Math.round(latestReading.soilMoisturePercent)}%` : '--',
      emphasis:
        latestReading && latestReading.soilMoisturePercent <= lowThreshold
          ? palette.terracotta
          : palette.ink,
    },
    {
      key: 'temperature',
      icon: <Thermometer size={16} color={palette.mustard} />,
      value: latestReading ? `${Math.round(latestReading.temperatureC)}°C` : '--',
      emphasis: palette.ink,
    },
    {
      key: 'humidity',
      icon: <Wind size={16} color={palette.inkSoft} />,
      value: latestReading ? `${Math.round(latestReading.humidityPercent)}%` : '--',
      emphasis: palette.ink,
    },
  ];

  if (latestReading?.batteryPercent != null) {
    items.push({
      key: 'battery',
      icon: getBatteryIcon(latestReading.batteryPercent),
      value: `${Math.round(latestReading.batteryPercent)}%`,
      emphasis: palette.inkSoft,
    });
  }

  if (latestReading?.signalStrength != null) {
    items.push({
      key: 'signal',
      icon: getSignalIcon(latestReading.signalStrength),
      value: `${Math.round(latestReading.signalStrength)} dBm`,
      emphasis: palette.inkSoft,
    });
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
      {items.map((item) => (
        <MetricChip
          key={item.key}
          icon={item.icon}
          value={item.value}
          emphasis={item.emphasis}
        />
      ))}
    </View>
  );
}

function MetricChip({
  icon,
  value,
  emphasis,
}: {
  icon: React.ReactNode;
  value: string;
  emphasis: string;
}) {
  return (
    <View
      style={{
        minWidth: 92,
        flexGrow: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: palette.outline,
        backgroundColor: palette.white,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: radii.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.parchment,
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          color: emphasis,
          fontFamily: typography.bodyStrong,
          fontSize: 13,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function getBatteryIcon(percent: number) {
  if (percent <= 20) {
    return <BatteryLow size={16} color={palette.terracotta} />;
  }

  if (percent <= 55) {
    return <BatteryMedium size={16} color={palette.mustard} />;
  }

  if (percent <= 80) {
    return <Battery size={16} color={palette.leafDark} />;
  }

  return <BatteryFull size={16} color={palette.leafDark} />;
}

function getSignalIcon(signalStrength: number) {
  if (signalStrength <= -100) {
    return <SignalZero size={16} color={palette.terracotta} />;
  }

  if (signalStrength <= -90) {
    return <SignalLow size={16} color={palette.mustard} />;
  }

  if (signalStrength <= -75) {
    return <SignalMedium size={16} color={palette.leafDark} />;
  }

  return <SignalHigh size={16} color={palette.leafDark} />;
}
