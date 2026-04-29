import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AlertCircle, Cloud } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AdvisoryStack } from '@/components/advisory-stack';
import { WeatherSummaryPanel } from '@/components/weather-summary-panel';
import type { WeatherSummary } from '@/lib/api-types';
import { gradients, palette, radii, shadow, spacing, typography } from '@/theme/tokens';

type WeatherHeroCardProps = {
  weather: WeatherSummary | null;
  expanded?: boolean;
  loading?: boolean;
  refreshing?: boolean;
  errorMessage?: string | null;
  onOpen?: () => void;
  onForecast?: () => void;
  onAdvisory?: () => void;
  onRefresh?: () => void;
  forecastLabel?: string;
  advisoryLabel?: string;
};

export function WeatherHeroCard({
  weather,
  expanded = false,
  loading = false,
  refreshing = false,
  errorMessage,
  onOpen,
  onForecast,
  onAdvisory,
  onRefresh,
  forecastLabel,
  advisoryLabel,
}: WeatherHeroCardProps) {
  if (!weather) {
    return (
      <EmptyWeatherCard
        loading={loading}
        errorMessage={errorMessage}
        onRefresh={onRefresh}
      />
    );
  }

  return (
    <>
      <WeatherSummaryPanel
        weather={weather}
        expanded={expanded}
        onOpen={onOpen}
        onForecast={onForecast}
        onAdvisory={onAdvisory}
        onRefresh={onRefresh}
        refreshing={refreshing}
        forecastLabel={forecastLabel}
        advisoryLabel={advisoryLabel}
      />
      {expanded ? <AdvisoryStack advisories={weather.advisories} /> : null}
    </>
  );
}

function EmptyWeatherCard({
  loading,
  errorMessage,
  onRefresh,
}: {
  loading: boolean;
  errorMessage?: string | null;
  onRefresh?: () => void;
}) {
  const message = loading
    ? 'Loading weather data...'
    : errorMessage || 'No weather data available right now.';

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
        colors={[...gradients.weatherRain]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          padding: spacing.lg,
          gap: spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {loading ? (
            <ActivityIndicator color={palette.white} />
          ) : errorMessage ? (
            <AlertCircle color="#FFF1B8" size={18} />
          ) : (
            <Cloud color={palette.white} size={18} />
          )}
          <Text
            style={{
              color: palette.white,
              fontFamily: typography.bodyStrong,
              fontSize: 16,
            }}
          >
            Current weather
          </Text>
        </View>
        <Text
          style={{
            color: 'rgba(255,255,255,0.86)',
            fontFamily: typography.bodyRegular,
            fontSize: 13,
            lineHeight: 19,
          }}
        >
          {message}
        </Text>
        {onRefresh && !loading ? (
          <Pressable onPress={onRefresh}>
            <Text
              style={{
                color: palette.white,
                fontFamily: typography.bodyStrong,
                fontSize: 12,
              }}
            >
              Refresh weather
            </Text>
          </Pressable>
        ) : null}
      </LinearGradient>
    </View>
  );
}
