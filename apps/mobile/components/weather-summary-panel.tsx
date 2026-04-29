import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import {
  AlertCircle,
  Cloud,
  CloudRain,
  Droplets,
  RefreshCw,
  Wind,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ForecastStrip } from '@/components/forecast-strip';
import { HourlyForecastRail } from '@/components/hourly-forecast-rail';
import type { WeatherSummary } from '@/lib/api-types';
import { formatRelativeTime } from '@/lib/format';
import { gradients, palette, radii, shadow, spacing, typography } from '@/theme/tokens';

type WeatherSummaryPanelProps = {
  weather: WeatherSummary;
  expanded?: boolean;
  onOpen?: () => void;
  onForecast?: () => void;
  onAdvisory?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  forecastLabel?: string;
  advisoryLabel?: string;
};

export function WeatherSummaryPanel({
  weather,
  expanded = false,
  onOpen,
  onForecast,
  onAdvisory,
  onRefresh,
  refreshing = false,
  forecastLabel = '7-day forecast',
  advisoryLabel = 'Weather advisory',
}: WeatherSummaryPanelProps) {
  const gradient = getWeatherGradient(weather.current.conditionCode);
  const updatedLabel = formatRelativeTime(
    weather.current.updatedAt || weather.freshness.capturedAt,
  );
  const advisory = weather.advisories[0];
  const isFallback = weather.sourceMeta.isFallback;

  return (
    <View
      style={{
        overflow: 'hidden',
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        boxShadow: shadow.weather,
      }}
    >
      <LinearGradient
        colors={[...gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          padding: spacing.lg,
          gap: spacing.md,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: spacing.md,
          }}
        >
          <View style={{ flex: 1, gap: spacing.xs }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: spacing.xs,
              }}
            >
              <Cloud color={palette.white} size={18} />
              <Text
                style={{
                  color: palette.white,
                  fontFamily: typography.bodyStrong,
                  fontSize: 16,
                }}
              >
                Current weather
              </Text>
              {isFallback ? <StatusBadge label="Demo data" tone="warning" /> : null}
            </View>
            <Text
              style={{
                color: 'rgba(255,255,255,0.80)',
                fontFamily: typography.bodyRegular,
                fontSize: 12,
              }}
            >
              {weather.sourceMeta.locationLabel}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
            <Text
              style={{
                color: 'rgba(255,255,255,0.74)',
                fontFamily: typography.bodyRegular,
                fontSize: 11,
              }}
            >
              {refreshing ? 'Updating...' : updatedLabel}
            </Text>
            {onRefresh ? (
              <Pressable
                onPress={onRefresh}
                disabled={refreshing}
                style={{
                  width: 34,
                  height: 34,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radii.pill,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                }}
              >
                {refreshing ? (
                  <ActivityIndicator color={palette.white} size="small" />
                ) : (
                  <RefreshCw color={palette.white} size={16} />
                )}
              </Pressable>
            ) : null}
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: spacing.md,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{
                color: palette.white,
                fontFamily: typography.displayBold,
                fontSize: 32,
                lineHeight: 38,
              }}
            >
              {Math.round(weather.current.temperatureC)}°C
            </Text>
            <Text
              style={{
                color: 'rgba(255,255,255,0.92)',
                fontFamily: typography.bodyStrong,
                fontSize: 15,
              }}
            >
              {weather.current.conditionLabel}
            </Text>
            <Text
              style={{
                color: 'rgba(255,255,255,0.72)',
                fontFamily: typography.bodyRegular,
                fontSize: 12,
              }}
            >
              Feels like {Math.round(weather.current.feelsLikeC)}°C
            </Text>
          </View>

          <View style={{ gap: spacing.sm }}>
            <InlineMetric
              icon={<Droplets color={palette.white} size={14} />}
              value={`${weather.current.humidityPercent}%`}
            />
            <InlineMetric
              icon={<Wind color={palette.white} size={14} />}
              value={`${Math.round(weather.current.windSpeedKph)} km/h`}
            />
            <InlineMetric
              icon={<CloudRain color={palette.white} size={14} />}
              value={`${weather.current.rainProbabilityPercent}% rain`}
            />
          </View>
        </View>

        <View
          style={{
            paddingTop: spacing.md,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.18)',
            gap: spacing.md,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text
              style={{
                color: palette.white,
                fontFamily: typography.bodyStrong,
                fontSize: 14,
              }}
            >
              {advisory?.title ?? weather.current.conditionLabel}
            </Text>
            <Text
              style={{
                color: 'rgba(255,255,255,0.82)',
                fontFamily: typography.bodyRegular,
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              {advisory?.message ?? weather.fieldWindows.sprayWindow.summary}
            </Text>
          </View>

          {expanded ? (
            <View style={{ gap: spacing.sm }}>
              <HourlyForecastRail hours={weather.hourly} />
              <ForecastStrip days={weather.daily} />
            </View>
          ) : null}

          {isFallback ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: spacing.sm,
                padding: spacing.sm,
                borderRadius: radii.lg,
                backgroundColor: 'rgba(234, 195, 88, 0.18)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
              }}
            >
              <AlertCircle color="#FFF1B8" size={16} style={{ marginTop: 1 }} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    color: '#FFF1B8',
                    fontFamily: typography.bodyStrong,
                    fontSize: 11,
                  }}
                >
                  Fallback mode active
                </Text>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.82)',
                    fontFamily: typography.bodyRegular,
                    fontSize: 11,
                    lineHeight: 16,
                  }}
                >
                  Weather is being served from backend-safe fallback data for now.
                </Text>
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {onForecast ? (
              <ActionButton label={forecastLabel} onPress={onForecast} />
            ) : null}
            {onAdvisory ? (
              <ActionButton label={advisoryLabel} onPress={onAdvisory} />
            ) : null}
            {!onForecast && !onAdvisory && onOpen ? (
              <ActionButton label="Open weather" onPress={onOpen} />
            ) : null}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

function InlineMetric({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
      }}
    >
      {icon}
      <Text
        style={{
          color: palette.white,
          fontFamily: typography.bodyRegular,
          fontSize: 12,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'warning' | 'neutral';
}) {
  const backgroundColor =
    tone === 'warning' ? 'rgba(234, 195, 88, 0.22)' : 'rgba(255,255,255,0.18)';
  const color = tone === 'warning' ? '#FFF1B8' : palette.white;

  return (
    <View
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: 5,
        borderRadius: radii.pill,
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

function ActionButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 38,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        borderRadius: radii.pill,
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
      }}
    >
      <Text
        style={{
          color: palette.white,
          fontFamily: typography.bodyStrong,
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function getWeatherGradient(conditionCode: WeatherSummary['current']['conditionCode']) {
  if (conditionCode === 'HEAT' || conditionCode === 'CLEAR') {
    return gradients.weatherClear;
  }

  if (
    conditionCode === 'LIGHT_RAIN' ||
    conditionCode === 'RAIN' ||
    conditionCode === 'HEAVY_RAIN'
  ) {
    return gradients.weatherRain;
  }

  if (conditionCode === 'STORM') {
    return gradients.weatherStorm;
  }

  return gradients.weatherRain;
}
