import { ScrollView, Text, View } from 'react-native';

import type { WeatherSummary } from '@/lib/api-types';
import { palette, radii, spacing, typography } from '@/theme/tokens';

export function HourlyForecastRail({
  hours,
}: {
  hours: WeatherSummary['hourly'];
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm }}
    >
      {hours.map((hour) => (
        <View
          key={hour.time}
          style={{
            width: 86,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.md,
            borderRadius: radii.lg,
            backgroundColor: 'rgba(255,255,255,0.10)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.14)',
            gap: 6,
          }}
        >
          <Text
            style={{
              color: 'rgba(255,255,255,0.78)',
              fontFamily: typography.bodyRegular,
              fontSize: 11,
            }}
          >
            {formatHour(hour.time)}
          </Text>
          <Text
            style={{
              color: palette.white,
              fontFamily: typography.bodyStrong,
              fontSize: 16,
            }}
          >
            {Math.round(hour.temperatureC)}°C
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.72)',
              fontFamily: typography.bodyRegular,
              fontSize: 11,
            }}
          >
            {hour.rainProbabilityPercent}%
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function formatHour(value: string) {
  const date = new Date(value);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    hour12: true,
  });
}
