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
import type { MarketCropDetailResponse } from '@/lib/api-types';
import { storageKeys } from '@/lib/constants';
import { findSeasonContext } from '@/lib/domain';
import { formatCurrency, formatDistance } from '@/lib/format';
import {
  buildCropKey,
  buildMarketExplorerQueryString,
  type MarketExplorerScope,
  type MarketPinnedCrop,
} from '@/lib/market-explorer';
import { useStoredValue } from '@/lib/storage';
import { gradients, palette, spacing, typography } from '@/theme/tokens';

export default function CropMarketDetailRoute() {
  const params = useLocalSearchParams<{ cropName: string; scope?: string }>();
  const router = useRouter();
  const { profile, token } = useSession();
  const { location } = useDeviceLocation();
  const [selectedSeasonId] = useStoredValue(storageKeys.selectedSeasonId, '');
  const [pinnedCrops, setPinnedCrops] = useStoredValue<MarketPinnedCrop[]>(
    storageKeys.marketPinnedCrops,
    [],
  );

  const cropName = decodeURIComponent(params.cropName ?? '');
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
  const cropKey = buildCropKey(cropName);
  const pinned = pinnedCrops.some((crop) => crop.cropKey === cropKey);

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
    cacheKey: `market-crop-detail:${cropName}:${scope}:${activeLocation?.latitude ?? 'na'}:${activeLocation?.longitude ?? 'na'}`,
    queryKey: ['market-crop-detail', token, cropName, detailQueryString],
    enabled: Boolean(token && cropName),
    queryFn: () =>
      apiGet<MarketCropDetailResponse>(
        `/markets/explorer/crops/${encodeURIComponent(cropName)}?${detailQueryString}`,
        token,
      ),
  });

  const crop = detailQuery.data?.crop ?? null;
  const heroPrice = crop?.bestRecord?.priceModal ?? crop?.nearestRecord?.priceModal ?? null;

  if (!crop) {
    return (
      <>
        <Stack.Screen options={{ title: cropName || 'Crop detail' }} />
        <PageShell
          eyebrow="Crop detail"
          title={cropName || 'Crop detail'}
          subtitle={`Loading market data for ${scopeLabel}.`}
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
                ? detailQuery.error?.message ?? 'Could not load this crop right now.'
                : 'Loading crop quotes and mandi comparisons.'}
            </Text>
          </GradientFeatureCard>
        </PageShell>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: crop.cropName }} />
      <PageShell
        eyebrow="Crop detail"
        title={crop.cropName}
        subtitle={`${scopeLabel} market view`}
        heroTone="market"
        action={
          <Button
            fullWidth={false}
            label={pinned ? 'Unpin' : 'Pin'}
            variant="soft"
            onPress={() => {
              if (pinned) {
                setPinnedCrops(
                  pinnedCrops.filter((item) => item.cropKey !== cropKey),
                );
                return;
              }

              setPinnedCrops([
                ...pinnedCrops,
                {
                  cropKey,
                  cropName: crop.cropName,
                },
              ]);
            }}
          />
        }
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
              {heroPrice != null
                ? `Best visible quote ${formatCurrency(heroPrice)}`
                : 'No live quotes in this scope'}
            </Text>
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              {crop.bestRecord
                ? `${crop.bestRecord.mandiName} is currently the strongest visible mandi for ${crop.cropName}.`
                : `This crop is in your explorer, but no current mandi quote is visible in ${scopeLabel}.`}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <MetricBadge label={`${crop.mandiCount} mandis`} tone="info" />
              {crop.nearestRecord?.distanceKm != null ? (
                <MetricBadge
                  label={`Nearest ${formatDistance(crop.nearestRecord.distanceKm)}`}
                  tone="success"
                />
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
                  prompt: `Should I sell ${crop.cropName} now, wait, or store it based on the current mandi quotes?`,
                  originRoute: 'market',
                  focusCropSeasonId: selectedSeason?.id,
                  focusFarmPlotId: selectedSeason?.farmPlot.id,
                },
              } as never)
            }
          />
          <Button
            label="Sell or store"
            fullWidth={false}
            variant="soft"
            onPress={() => router.push('/sell-store')}
          />
        </View>

        {crop.bestRecord ? (
          <View style={{ gap: spacing.sm }}>
            <SectionHeaderRow eyebrow="Best visible" title="Top mandi" />
            <MarketQuoteCard
              title={crop.bestRecord.mandiName}
              subtitle={`${crop.bestRecord.district}, ${crop.bestRecord.state}`}
              price={crop.bestRecord.priceModal}
              helper={crop.bestRecord.freshnessLabel}
              badgeLabel={crop.bestRecord.trendLabel}
              badgeTone={trendTone(crop.bestRecord.trendDirection)}
              distanceLabel={
                crop.bestRecord.distanceKm != null
                  ? formatDistance(crop.bestRecord.distanceKm)
                  : null
              }
            />
          </View>
        ) : null}

        {crop.nearestRecord ? (
          <View style={{ gap: spacing.sm }}>
            <SectionHeaderRow eyebrow="Nearest option" title="Closest mandi" />
            <MarketQuoteCard
              title={crop.nearestRecord.mandiName}
              subtitle={`${crop.nearestRecord.district}, ${crop.nearestRecord.state}`}
              price={crop.nearestRecord.priceModal}
              helper={crop.nearestRecord.freshnessLabel}
              badgeLabel={crop.nearestRecord.trendLabel}
              badgeTone={trendTone(crop.nearestRecord.trendDirection)}
              distanceLabel={formatDistance(crop.nearestRecord.distanceKm)}
            />
          </View>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <SectionHeaderRow
            eyebrow={`${crop.records.length} quotes`}
            title={`All mandis in ${scopeLabel}`}
          />
          {crop.records.length ? (
            crop.records.map((record) => (
              <MarketQuoteCard
                key={`${record.id}-${record.mandiName}`}
                title={record.mandiName}
                subtitle={`${record.district}, ${record.state}`}
                price={record.priceModal}
                helper={`Range ${formatCurrency(record.priceMin)} - ${formatCurrency(record.priceMax)} • ${record.freshnessLabel}`}
                badgeLabel={record.trendLabel}
                badgeTone={trendTone(record.trendDirection)}
                distanceLabel={
                  record.distanceKm != null ? formatDistance(record.distanceKm) : null
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
              No current mandi quotes are visible for this crop in {scopeLabel}.
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
