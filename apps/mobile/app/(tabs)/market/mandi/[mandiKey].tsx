import { useMemo } from 'react';

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { GradientFeatureCard } from '@/components/gradient-feature-card';
import { MarketQuoteCard } from '@/components/market-quote-card';
import { MetricBadge } from '@/components/metric-badge';
import { PageShell } from '@/components/page-shell';
import { SectionHeaderRow } from '@/components/section-header-row';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { apiGet } from '@/lib/api';
import type { MarketMandiDetailResponse } from '@/lib/api-types';
import { storageKeys } from '@/lib/constants';
import { findSeasonContext } from '@/lib/domain';
import { formatCurrency, formatDistance } from '@/lib/format';
import {
  buildMarketExplorerQueryString,
  type MarketExplorerScope,
} from '@/lib/market-explorer';
import { useStoredValue } from '@/lib/storage';
import { gradients, palette, spacing, typography } from '@/theme/tokens';

export default function MandiDetailRoute() {
  const params = useLocalSearchParams<{ mandiKey: string; scope?: string }>();
  const router = useRouter();
  const { profile, token } = useSession();
  const { location } = useDeviceLocation();
  const [selectedSeasonId] = useStoredValue(storageKeys.selectedSeasonId, '');

  const mandiKey = params.mandiKey ?? '';
  const scope =
    params.scope === 'state' ? ('state' as MarketExplorerScope) : ('district' as MarketExplorerScope);
  const selectedSeason = findSeasonContext(profile, selectedSeasonId);
  const plotLocation =
    selectedSeason?.farmPlot.latitude != null &&
    selectedSeason?.farmPlot.longitude != null
      ? {
          latitude: selectedSeason.farmPlot.latitude,
          longitude: selectedSeason.farmPlot.longitude,
        }
      : null;
  const activeLocation = plotLocation ?? location;
  const scopeLabel =
    scope === 'district'
      ? profile?.user.district ?? 'your district'
      : profile?.user.state ?? 'your state';

  const detailQueryString = useMemo(
    () =>
      buildMarketExplorerQueryString({
        latitude: activeLocation?.latitude,
        longitude: activeLocation?.longitude,
        scope,
      }),
    [activeLocation?.latitude, activeLocation?.longitude, scope],
  );

  const detailQuery = useCachedQuery({
    cacheKey: `market-mandi-detail:${mandiKey}:${scope}:${activeLocation?.latitude ?? 'na'}:${activeLocation?.longitude ?? 'na'}`,
    queryKey: ['market-mandi-detail', token, mandiKey, detailQueryString],
    enabled: Boolean(token && mandiKey),
    queryFn: () =>
      apiGet<MarketMandiDetailResponse>(
        `/markets/explorer/mandis/${encodeURIComponent(mandiKey)}?${detailQueryString}`,
        token,
      ),
  });

  const mandi = detailQuery.data?.mandi ?? null;

  if (!mandi) {
    return (
      <>
        <Stack.Screen options={{ title: 'Mandi detail' }} />
        <PageShell
          eyebrow="Mandi detail"
          title="Loading mandi"
          subtitle={`Loading quotes for ${scopeLabel}.`}
          heroTone="market"
        >
          <GradientFeatureCard colors={gradients.marketGold} padding={16}>
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 14,
                lineHeight: 21,
              }}
            >
              {detailQuery.isError
                ? detailQuery.error?.message ?? 'Could not load this mandi right now.'
                : 'Loading mandi quotes and linked service context.'}
            </Text>
          </GradientFeatureCard>
        </PageShell>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: mandi.mandiName }} />
      <PageShell
        eyebrow="Mandi detail"
        title={mandi.mandiName}
        subtitle={`${mandi.district}, ${mandi.state}`}
        heroTone="market"
      >
        <GradientFeatureCard colors={gradients.marketGold} padding={16}>
          <View style={{ gap: spacing.sm }}>
            <Text
              style={{
                color: palette.ink,
                fontFamily: typography.bodyStrong,
                fontSize: 17,
                lineHeight: 22,
              }}
            >
              {mandi.topRecord
                ? `${mandi.topRecord.cropName} at ${formatCurrency(mandi.topRecord.priceModal)}`
                : 'No live quote at this mandi'}
            </Text>
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              {mandi.distanceKm != null
                ? `${formatDistance(mandi.distanceKm)} from the active location.`
                : `Distance is unavailable without location, but this mandi is still part of your ${scopeLabel} explorer.`}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <MetricBadge label={`${mandi.cropCount} crops`} tone="info" />
              {mandi.linkedFacility ? (
                <MetricBadge label="Linked facility" tone="success" />
              ) : null}
            </View>
          </View>
        </GradientFeatureCard>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            label="Ask Assistant"
            fullWidth={false}
            onPress={() =>
              router.push({
                pathname: '/voice',
                params: {
                  prompt: `Help me understand whether ${mandi.mandiName} is a good mandi choice right now based on its visible crop quotes and distance.`,
                  originRoute: 'market',
                  focusCropSeasonId: selectedSeason?.id,
                  focusFarmPlotId: selectedSeason?.farmPlot.id,
                },
              } as never)
            }
          />
          {mandi.linkedFacility ? (
            <Button
              label="Nearby facility"
              fullWidth={false}
              variant="soft"
              onPress={() => router.push('/facilities')}
            />
          ) : null}
        </View>

        {mandi.linkedFacility ? (
          <View style={{ gap: spacing.sm }}>
            <SectionHeaderRow eyebrow="Linked service" title="Facility context" />
            <GradientFeatureCard padding={16}>
              <View style={{ gap: spacing.sm }}>
                <Text
                  style={{
                    color: palette.ink,
                    fontFamily: typography.bodyStrong,
                    fontSize: 15,
                  }}
                >
                  {mandi.linkedFacility.primaryServiceLabel}
                </Text>
                <Text
                  style={{
                    color: palette.inkSoft,
                    fontFamily: typography.bodyRegular,
                    fontSize: 13,
                    lineHeight: 20,
                  }}
                >
                  {mandi.linkedFacility.travelHint}
                </Text>
                <Text
                  style={{
                    color: palette.inkMuted,
                    fontFamily: typography.bodyRegular,
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  Services: {mandi.linkedFacility.services.join(', ')}
                </Text>
              </View>
            </GradientFeatureCard>
          </View>
        ) : null}

        {mandi.topRecord ? (
          <View style={{ gap: spacing.sm }}>
            <SectionHeaderRow eyebrow="Top quote" title="Strongest current crop" />
            <MarketQuoteCard
              title={mandi.topRecord.cropName}
              subtitle={`${mandi.mandiName} • ${mandi.topRecord.freshnessLabel}`}
              price={mandi.topRecord.priceModal}
              helper={`Range ${formatCurrency(mandi.topRecord.priceMin)} - ${formatCurrency(mandi.topRecord.priceMax)}`}
              badgeLabel={mandi.topRecord.trendLabel}
              badgeTone={trendTone(mandi.topRecord.trendDirection)}
              distanceLabel={
                mandi.distanceKm != null ? formatDistance(mandi.distanceKm) : null
              }
            />
          </View>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <SectionHeaderRow
            eyebrow={`${mandi.records.length} quotes`}
            title={`All crops at this mandi`}
          />
          {mandi.records.length ? (
            mandi.records.map((record) => (
              <MarketQuoteCard
                key={`${record.id}-${record.cropName}`}
                title={record.cropName}
                subtitle={`${mandi.mandiName} • ${record.freshnessLabel}`}
                price={record.priceModal}
                helper={`Range ${formatCurrency(record.priceMin)} - ${formatCurrency(record.priceMax)}`}
                badgeLabel={record.trendLabel}
                badgeTone={trendTone(record.trendDirection)}
                distanceLabel={
                  mandi.distanceKm != null ? formatDistance(mandi.distanceKm) : null
                }
              />
            ))
          ) : (
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 14,
                lineHeight: 21,
              }}
            >
              No crop quotes are visible for this mandi in {scopeLabel}.
            </Text>
          )}
        </View>
      </PageShell>
    </>
  );
}

function trendTone(direction: 'UP' | 'DOWN' | 'STABLE') {
  if (direction === 'UP') {
    return 'success' as const;
  }

  if (direction === 'DOWN') {
    return 'danger' as const;
  }

  return 'neutral' as const;
}
