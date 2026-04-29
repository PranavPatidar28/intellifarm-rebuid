import { ScrollView, Text, View } from 'react-native';

import { CloudMoonRain, CloudRain, CloudSun, Sun, Zap } from 'lucide-react-native';

import type { WeatherSummary } from '@/lib/api-types';
import { formatShortDate } from '@/lib/format';
import { palette, radii, spacing, typography } from '@/theme/tokens';

export function ForecastStrip({
  days,
}: {
  days: WeatherSummary['daily'];
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm }}
    >
      {days.map((day) => (
        <View
          key={day.date}
          style={{
            width: 108,
            padding: spacing.md,
            borderRadius: radii.lg,
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.15)',
            gap: spacing.xs,
          }}
        >
          <Text
            style={{
              color: 'rgba(255,255,255,0.78)',
              fontFamily: typography.bodyStrong,
              fontSize: 12,
            }}
          >
            {formatShortDate(day.date)}
          </Text>
          <View>{renderWeatherGlyph(day.conditionCode)}</View>
          <Text
            style={{
              color: palette.white,
              fontFamily: typography.bodyStrong,
              fontSize: 14,
            }}
          >
            {Math.round(day.maxTemperatureC)}°C / {Math.round(day.minTemperatureC)}°C
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.72)',
              fontFamily: typography.bodyRegular,
              fontSize: 12,
            }}
          >
            {day.rainfallMm} mm
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function renderWeatherGlyph(code: WeatherSummary['daily'][number]['conditionCode']) {
  const common = { color: palette.white, size: 20 };

  if (code === 'STORM') {
    return <Zap {...common} />;
  }

  if (code === 'HEAVY_RAIN' || code === 'RAIN') {
    return <CloudRain {...common} />;
  }

  if (code === 'LIGHT_RAIN' || code === 'FOG') {
    return <CloudMoonRain {...common} />;
  }

  if (code === 'CLEAR' || code === 'HEAT') {
    return <Sun {...common} />;
  }

  return <CloudSun {...common} />;
}
