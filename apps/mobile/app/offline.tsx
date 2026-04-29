import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Stack } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/button';
import { CompactListCard } from '@/components/compact-list-card';
import { OfflineBanner } from '@/components/offline-banner';
import { PageShell } from '@/components/page-shell';
import { SunriseCard } from '@/components/sunrise-card';
import { useSession } from '@/features/session/session-provider';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { readCachedResource } from '@/lib/cache';
import type {
  AlertsResponse,
  DashboardWeeklyResponse,
  MarketsResponse,
  SchemesResponse,
  WeatherResponse,
} from '@/lib/api-types';
import { findSeasonContext } from '@/lib/domain';
import { flushPendingDiseaseUploads } from '@/lib/disease-upload';
import { formatCurrency, formatRelativeTime } from '@/lib/format';
import { storageKeys } from '@/lib/constants';
import { useStoredValue } from '@/lib/storage';
import { palette, spacing, typography } from '@/theme/tokens';

export default function OfflineRoute() {
  const queryClient = useQueryClient();
  const network = useNetworkStatus();
  const { profile, token, refreshSession } = useSession();
  const [selectedSeasonId] = useStoredValue(storageKeys.selectedSeasonId, '');
  const [pendingUploads] = useStoredValue(storageKeys.pendingDiseaseReports, []);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedSeason = findSeasonContext(profile, selectedSeasonId);

  const dashboardCache =
    readCachedResource<DashboardWeeklyResponse>(`dashboard-weekly:${selectedSeasonId || 'default'}`) ??
    readCachedResource<DashboardWeeklyResponse>('dashboard-weekly:default');
  const weatherCache = readCachedResource<WeatherResponse>(
    `weather:${selectedSeason?.farmPlot.id ?? 'default'}`,
  );
  const marketsCache = readCachedResource<MarketsResponse>(
    `markets:${selectedSeason?.cropName ?? 'default'}`,
  );
  const schemesCache = readCachedResource<SchemesResponse>(
    `schemes:${selectedSeason?.cropName ?? 'default'}`,
  );
  const alertsCache = readCachedResource<AlertsResponse>('alerts');

  const featuredSeason = useMemo(() => dashboardCache?.data.featuredSeason ?? null, [dashboardCache?.data]);

  const retrySync = async () => {
    if (!token || network.isOffline) {
      setMessage('Internet is still unavailable. Cached advice remains visible.');
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const syncedCount = await flushPendingDiseaseUploads(token);
      await refreshSession();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard-weekly', token, selectedSeasonId] }),
        queryClient.invalidateQueries({ queryKey: ['disease-reports', token] }),
      ]);
      setMessage(
        syncedCount
          ? `${syncedCount} pending upload(s) were synced successfully.`
          : 'Sync completed. No pending uploads were waiting.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Offline mode' }} />
      <PageShell
        eyebrow="Offline farm plan"
        title="Cached farm guidance"
        subtitle="When the network drops, IntelliFarm shows the last saved weekly view instead of failing silently."
      >
        <OfflineBanner
          cachedAt={dashboardCache?.savedAt ?? null}
          pendingLabel={
            pendingUploads.length
              ? `${pendingUploads.length} diagnosis upload(s) are still waiting to sync.`
              : network.isOffline
                ? 'You are offline. Cached advice is read-only until connectivity returns.'
                : 'You are online. Cached advice is still available for weak-signal moments.'
          }
        />

        {featuredSeason ? (
          <SunriseCard accent="soft" title="Last saved weekly plan">
            <View style={{ gap: spacing.xs }}>
              <Text
                style={{
                  color: palette.ink,
                  fontFamily: typography.bodyStrong,
                  fontSize: 15,
                }}
              >
                {featuredSeason.cropName} - {featuredSeason.currentStage}
              </Text>
              <Text
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                {dashboardCache?.data.taskFocus?.pendingCount ?? 0} actions saved. {dashboardCache?.data.offlineState.message}
              </Text>
            </View>
          </SunriseCard>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <CacheCard
            title="Weather snapshot"
            timestamp={weatherCache?.savedAt}
            description={
              weatherCache?.data.weather.advisories[0]?.message ??
              weatherCache?.data.weather.current.conditionLabel ??
              'No cached weather summary yet.'
            }
          />
          <CacheCard
            title="Mandi snapshot"
            timestamp={marketsCache?.savedAt}
            description={
              marketsCache?.data.recommendedRecord
                ? `${marketsCache.data.recommendedRecord.mandiName} - ${formatCurrency(marketsCache.data.recommendedRecord.priceModal)}`
                : 'No cached mandi summary yet.'
            }
          />
          <CacheCard
            title="Schemes saved"
            timestamp={schemesCache?.savedAt}
            description={
              schemesCache?.data.schemes.length
                ? schemesCache.data.schemes.slice(0, 2).map((item) => item.title).join(', ')
                : 'No cached scheme list yet.'
            }
          />
          <CacheCard
            title="Alerts saved"
            timestamp={alertsCache?.savedAt}
            description={
              alertsCache?.data.alerts.length
                ? alertsCache.data.alerts[0].title
                : 'No cached alerts yet.'
            }
          />
        </View>

        {message ? (
          <SunriseCard accent="info" title="Sync status">
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 13,
                lineHeight: 19,
              }}
            >
              {message}
            </Text>
          </SunriseCard>
        ) : null}

        <Button
          label={busy ? 'Retrying sync...' : 'Retry sync'}
          loading={busy}
          onPress={() => {
            void retrySync();
          }}
        />
      </PageShell>
    </>
  );
}

function CacheCard({
  title,
  description,
  timestamp,
}: {
  title: string;
  description: string;
  timestamp?: string | null;
}) {
  return (
    <CompactListCard
      title={title}
      subtitle={description}
      meta={timestamp ? `Saved ${formatRelativeTime(timestamp)}` : 'Not cached yet'}
    />
  );
}
