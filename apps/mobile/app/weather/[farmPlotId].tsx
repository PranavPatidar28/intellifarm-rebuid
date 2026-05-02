import { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { CloudRain, Sprout, Waves } from 'lucide-react-native';

import { AdvisoryStack } from '@/components/advisory-stack';
import { InsightRow } from '@/components/insight-row';
import { PageShell } from '@/components/page-shell';
import { SunriseCard } from '@/components/sunrise-card';
import { WeatherHeroCard } from '@/components/weather-hero-card';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { apiGet } from '@/lib/api';
import type { WeatherResponse } from '@/lib/api-types';
import { palette, spacing, typography } from '@/theme/tokens';

export default function WeatherRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    farmPlotId: string;
    latitude?: string;
    longitude?: string;
  }>();
  const { token } = useSession();
  const { location, refreshLocation } = useDeviceLocation();

  useEffect(() => {
    void refreshLocation();
  }, [refreshLocation]);

  const liveLocation = useMemo(() => {
    if (location) {
      return location;
    }

    const latitude =
      typeof params.latitude === 'string' ? Number.parseFloat(params.latitude) : Number.NaN;
    const longitude =
      typeof params.longitude === 'string' ? Number.parseFloat(params.longitude) : Number.NaN;

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }

    return null;
  }, [location, params.latitude, params.longitude]);

  const weatherQueryString = useMemo(() => {
    if (!liveLocation) {
      return '';
    }

    const query = new URLSearchParams({
      latitude: String(liveLocation.latitude),
      longitude: String(liveLocation.longitude),
    });

    return `?${query.toString()}`;
  }, [liveLocation]);

  const weatherQuery = useCachedQuery({
    cacheKey: `weather:${params.farmPlotId}:${liveLocation?.latitude ?? 'na'}:${liveLocation?.longitude ?? 'na'}`,
    queryKey: ['weather', token, params.farmPlotId, liveLocation?.latitude, liveLocation?.longitude],
    enabled: Boolean(token && params.farmPlotId),
    queryFn: () =>
      apiGet<WeatherResponse>(
        `/farm-plots/${params.farmPlotId}/weather${weatherQueryString}`,
        token,
      ),
  });

  const weather = weatherQuery.data?.weather;

  return (
    <>
      <Stack.Screen options={{ title: 'Weather actions' }} />
      <PageShell
        eyebrow="Weather-based farm alerts"
        title={weather?.sourceMeta.locationLabel ?? 'Weather actions'}
        subtitle={
          weather
            ? `${weather.sourceMeta.accuracyLabel} • ${weather.current.conditionLabel}`
            : 'Loading weather-guided field actions.'
        }
        heroTone="weather"
      >
        <WeatherHeroCard
          weather={weather ?? null}
          expanded
          loading={weatherQuery.isLoading && !weather}
          refreshing={weatherQuery.isFetching}
          errorMessage={weatherQuery.error ? 'Unable to fetch weather data.' : null}
          onRefresh={() => {
            void weatherQuery.refetch();
          }}
          onForecast={() => {
            void weatherQuery.refetch();
          }}
          forecastLabel="Refresh weather"
          onAdvisory={() => router.push('/crop-plan')}
          advisoryLabel="Crop plan"
        />

        {weather ? (
          <>
            <SunriseCard accent="soft" title="Field windows">
              <View style={{ gap: spacing.sm }}>
                <InsightRow
                  icon={<CloudRain color={palette.sky} size={16} />}
                  label="Spray window"
                  value={weather.fieldWindows.sprayWindow.summary}
                />
                <InsightRow
                  icon={<Waves color={palette.mustard} size={16} />}
                  label="Irrigation window"
                  value={weather.fieldWindows.irrigationWindow.summary}
                />
                <InsightRow
                  icon={<Sprout color={palette.leaf} size={16} />}
                  label="Harvest movement"
                  value={weather.fieldWindows.harvestWindow.summary}
                />
              </View>
            </SunriseCard>

            <SunriseCard accent="info" title="Risk signals">
              <View style={{ gap: spacing.sm }}>
                <RiskLine label="Spray risk" value={weather.riskSignals.sprayRisk.reason} />
                <RiskLine label="Irrigation need" value={weather.riskSignals.irrigationNeed.reason} />
                <RiskLine label="Heat stress" value={weather.riskSignals.heatStressRisk.reason} />
                <RiskLine label="Flood risk" value={weather.riskSignals.floodRisk.reason} />
              </View>
            </SunriseCard>

            <SunriseCard accent="soft" title="Listen-friendly advisories">
              <AdvisoryStack advisories={weather.advisories} />
            </SunriseCard>
          </>
        ) : (
          <SunriseCard accent="info" title="Weather feed loading">
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 14,
              }}
            >
              Weather advice will appear here with field actions, rain timing, and safe windows.
            </Text>
          </SunriseCard>
        )}
      </PageShell>
    </>
  );
}

function RiskLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text
        style={{
          color: palette.ink,
          fontFamily: typography.bodyStrong,
          fontSize: 13,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: palette.inkSoft,
          fontFamily: typography.bodyRegular,
          fontSize: 13,
          lineHeight: 20,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
