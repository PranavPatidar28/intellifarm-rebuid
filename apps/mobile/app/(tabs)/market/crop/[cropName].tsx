import { useMemo, useState } from 'react';

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, MapPin, Sparkles, TrendingDown, TrendingUp } from 'lucide-react-native';

import { Button } from '@/components/button';
import { GradientFeatureCard } from '@/components/gradient-feature-card';
import { MarketQuoteCard } from '@/components/market-quote-card';
import { MetricBadge } from '@/components/metric-badge';
import { MotionPressable } from '@/components/motion-pressable';
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
import { gradients, palette, radii, semanticColors, spacing, typography } from '@/theme/tokens';

const INITIAL_RECORDS = 5;

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
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [sortMode, setSortMode] = useState<'price_high' | 'price_low' | 'nearest'>('price_high');

  const cropName = decodeURIComponent(params.cropName ?? '');
  const scope =
    params.scope === 'state'
      ? ('state' as MarketExplorerScope)
      : ('district' as MarketExplorerScope);
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

  // ── API query ───────────────────────────────────────────────────────

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

  // ── Derived stats ───────────────────────────────────────────────────

  const stats = useMemo(() => {
    if (!crop) return null;
    const records = crop.records ?? [];
    const allMin = records.map((r: any) => r.priceMin).filter((p: number) => p > 0);
    const allMax = records.map((r: any) => r.priceMax).filter((p: number) => p > 0);
    return {
      overallMin: allMin.length ? Math.min(...allMin) : null,
      overallMax: allMax.length ? Math.max(...allMax) : null,
      delta: crop.bestRecord?.deltaFromPrevious ?? null,
    };
  }, [crop]);

  // ── Progressive disclosure + sorting ─────────────────────────────

  const allRecords = crop?.records ?? [];
  const recordsWithDistance = useMemo(
    () => allRecords.filter((r: any) => r.distanceKm != null).length,
    [allRecords],
  );
  const sortedRecords = useMemo(() => {
    return [...allRecords].sort((a: any, b: any) => {
      if (sortMode === 'price_high') return (b.priceModal ?? 0) - (a.priceModal ?? 0);
      if (sortMode === 'price_low') return (a.priceModal ?? 0) - (b.priceModal ?? 0);
      // nearest — records with distance first, sorted ascending; null-distance at end
      const aHas = a.distanceKm != null ? 0 : 1;
      const bHas = b.distanceKm != null ? 0 : 1;
      if (aHas !== bHas) return aHas - bHas;
      return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
    });
  }, [allRecords, sortMode]);
  const displayedRecords = showAllRecords
    ? sortedRecords
    : sortedRecords.slice(0, INITIAL_RECORDS);
  const hasMoreRecords = sortedRecords.length > INITIAL_RECORDS;

  // ── Actions ─────────────────────────────────────────────────────────

  const togglePin = () => {
    if (pinned) {
      setPinnedCrops(pinnedCrops.filter((item) => item.cropKey !== cropKey));
    } else {
      setPinnedCrops([
        ...pinnedCrops,
        { cropKey, cropName: crop?.cropName ?? cropName },
      ]);
    }
  };

  const askAssistant = () =>
    router.push({
      pathname: '/voice',
      params: {
        prompt: `Should I sell ${cropName} now, wait, or store it based on the current mandi quotes?`,
        originRoute: 'market',
        focusCropSeasonId: selectedSeason?.id,
        focusFarmPlotId: selectedSeason?.farmPlot.id,
      },
    } as never);

  // ── Loading state ───────────────────────────────────────────────────

  if (detailQuery.isLoading && !crop) {
    return (
      <>
        <Stack.Screen options={{ title: cropName || 'Crop detail' }} />
        <PageShell
          eyebrow="Crop detail"
          title={cropName || 'Crop detail'}
          subtitle={`Loading ${scopeLabel} market data…`}
          heroTone="market"
        >
          <GradientFeatureCard colors={gradients.marketGold} padding={16}>
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ActivityIndicator color={palette.leafDark} size="large" />
              <Text
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 14,
                  marginTop: spacing.md,
                }}
              >
                Fetching live prices for {cropName}…
              </Text>
            </View>
          </GradientFeatureCard>
        </PageShell>
      </>
    );
  }

  // ── Error / empty state ─────────────────────────────────────────────

  if (detailQuery.isError || !crop) {
    return (
      <>
        <Stack.Screen options={{ title: cropName || 'Crop detail' }} />
        <PageShell
          eyebrow="Crop detail"
          title={cropName || 'Crop detail'}
          subtitle={`${scopeLabel} market view`}
          heroTone="market"
        >
          <GradientFeatureCard colors={gradients.marketGold} padding={16}>
            <View style={{ gap: spacing.sm }}>
              <Text
                style={{
                  color: palette.ink,
                  fontFamily: typography.bodyStrong,
                  fontSize: 16,
                }}
              >
                Could not load market data
              </Text>
              <Text
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 13,
                  lineHeight: 20,
                }}
              >
                {detailQuery.error?.message ??
                  'No mandi quotes are available for this crop right now. Please try again later.'}
              </Text>
            </View>
          </GradientFeatureCard>
          <Button
            label="Go back"
            onPress={() => router.back()}
            fullWidth={false}
            variant="soft"
          />
        </PageShell>
      </>
    );
  }

  // ── Compute display values ──────────────────────────────────────────

  const heroPrice =
    crop.bestRecord?.priceModal ?? crop.nearestRecord?.priceModal ?? null;
  const trendDir = crop.bestRecord?.trendDirection ?? 'STABLE';
  const delta = stats?.delta;
  const deltaAbs = delta != null ? Math.abs(delta) : null;

  // ── Hero card content ───────────────────────────────────────────────

  const heroContent = (
    <GradientFeatureCard colors={gradients.marketGold} padding={20}>
      <View style={{ gap: spacing.sm }}>
        {/* Big price */}
        {heroPrice != null ? (
          <View style={{ gap: 4 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                gap: 6,
              }}
            >
              <Text
                style={{
                  color: palette.leafDark,
                  fontFamily: typography.display,
                  fontSize: 34,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatCurrency(heroPrice)}
              </Text>
              <Text
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 14,
                }}
              >
                / qtl
              </Text>
            </View>

            {/* Trend delta */}
            {delta != null && delta !== 0 && deltaAbs != null ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {delta > 0 ? (
                  <TrendingUp
                    color={palette.leafDark}
                    size={14}
                    strokeWidth={2.2}
                  />
                ) : (
                  <TrendingDown
                    color={semanticColors.danger}
                    size={14}
                    strokeWidth={2.2}
                  />
                )}
                <Text
                  style={{
                    color:
                      delta > 0 ? palette.leafDark : semanticColors.danger,
                    fontFamily: typography.bodyStrong,
                    fontSize: 13,
                  }}
                >
                  {formatCurrency(deltaAbs)}{' '}
                  {delta > 0 ? 'up' : 'down'} from previous
                </Text>
              </View>
            ) : null}

            {/* Price range across all mandis */}
            {stats?.overallMin != null && stats?.overallMax != null ? (
              <Text
                style={{
                  color: palette.inkMuted,
                  fontFamily: typography.bodyRegular,
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                Range across mandis: {formatCurrency(stats.overallMin)} —{' '}
                {formatCurrency(stats.overallMax)}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyStrong,
              fontSize: 17,
            }}
          >
            No live quotes in this scope
          </Text>
        )}

        {/* Badges */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
          }}
        >
          <MetricBadge label={`${crop.mandiCount} mandis`} tone="info" />
          <MetricBadge
            label={crop.bestRecord?.trendLabel ?? 'Rates steady'}
            tone={trendTone(trendDir)}
          />
          {crop.bestRecord?.freshnessLabel ? (
            <MetricBadge
              label={crop.bestRecord.freshnessLabel}
              tone="neutral"
            />
          ) : null}
          {crop.nearestRecord?.distanceKm != null ? (
            <MetricBadge
              label={`Nearest ${formatDistance(crop.nearestRecord.distanceKm)}`}
              tone="success"
            />
          ) : null}
        </View>

        {/* Best mandi name */}
        {crop.bestRecord ? (
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 13,
              lineHeight: 20,
            }}
          >
            Best price at {crop.bestRecord.mandiName},{' '}
            {crop.bestRecord.district}
          </Text>
        ) : null}
      </View>
    </GradientFeatureCard>
  );

  // ── Render ──────────────────────────────────────────────────────────

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
            onPress={togglePin}
          />
        }
      >
        {/* ── Hero price card ──────────────────────────────────── */}
        {heroContent}

        {/* ── Action buttons ───────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button label="Ask Assistant" fullWidth={false} onPress={askAssistant} />
        </View>

        {/* ── Best mandi ───────────────────────────────────────── */}
        {crop.bestRecord ? (
          <View style={{ gap: spacing.sm }}>
            <SectionHeaderRow eyebrow="Highest price" title="Best Mandi" />
            <MarketQuoteCard
              title={crop.bestRecord.mandiName}
              subtitle={`${crop.bestRecord.district}, ${crop.bestRecord.state}`}
              price={crop.bestRecord.priceModal}
              helper={`Range ${formatCurrency(crop.bestRecord.priceMin)} – ${formatCurrency(crop.bestRecord.priceMax)} • ${crop.bestRecord.freshnessLabel}`}
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

        {/* ── Nearest mandi ────────────────────────────────────── */}
        {crop.nearestRecord &&
        crop.nearestRecord.id !== crop.bestRecord?.id ? (
          <View style={{ gap: spacing.sm }}>
            <SectionHeaderRow eyebrow="Closest to you" title="Nearest Mandi" />
            <MarketQuoteCard
              title={crop.nearestRecord.mandiName}
              subtitle={`${crop.nearestRecord.district}, ${crop.nearestRecord.state}`}
              price={crop.nearestRecord.priceModal}
              helper={`Range ${formatCurrency(crop.nearestRecord.priceMin)} – ${formatCurrency(crop.nearestRecord.priceMax)} • ${crop.nearestRecord.freshnessLabel}`}
              badgeLabel={crop.nearestRecord.trendLabel}
              badgeTone={trendTone(crop.nearestRecord.trendDirection)}
              distanceLabel={formatDistance(crop.nearestRecord.distanceKm)}
            />
          </View>
        ) : null}

        {/* ── All mandis list ──────────────────────────────────── */}
        <View style={{ gap: spacing.sm }}>
          <SectionHeaderRow
            eyebrow={`${allRecords.length} quotes`}
            title={`All mandis in ${scopeLabel}`}
          />

          {/* Sort filter pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            <SortPill
              label="Price: High"
              icon={ArrowDownWideNarrow}
              active={sortMode === 'price_high'}
              onPress={() => setSortMode('price_high')}
            />
            <SortPill
              label="Price: Low"
              icon={ArrowUpNarrowWide}
              active={sortMode === 'price_low'}
              onPress={() => setSortMode('price_low')}
            />
            {recordsWithDistance > 0 ? (
              <SortPill
                label={`Nearest (${recordsWithDistance})`}
                icon={MapPin}
                active={sortMode === 'nearest'}
                onPress={() => setSortMode('nearest')}
              />
            ) : null}
          </ScrollView>
          {displayedRecords.length ? (
            displayedRecords.map((record: any) => (
              <MarketQuoteCard
                key={`${record.id}-${record.mandiName}`}
                title={record.mandiName}
                subtitle={`${record.district}, ${record.state}`}
                price={record.priceModal}
                helper={`Range ${formatCurrency(record.priceMin)} – ${formatCurrency(record.priceMax)} • ${record.freshnessLabel}`}
                badgeLabel={record.trendLabel}
                badgeTone={trendTone(record.trendDirection)}
                distanceLabel={
                  record.distanceKm != null
                    ? formatDistance(record.distanceKm)
                    : null
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
              No mandi quotes available for {cropName} in {scopeLabel}.
            </Text>
          )}
          {hasMoreRecords && !showAllRecords ? (
            <Pressable
              onPress={() => setShowAllRecords(true)}
              style={{
                alignItems: 'center',
                paddingVertical: 14,
                borderRadius: radii.xl,
                borderCurve: 'continuous',
                backgroundColor: palette.leafMist,
                borderWidth: 1,
                borderColor: 'rgba(30, 94, 59, 0.12)',
              }}
            >
              <Text
                style={{
                  color: palette.leafDark,
                  fontFamily: typography.bodyStrong,
                  fontSize: 14,
                }}
              >
                View all {allRecords.length} mandis
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* ── AI CTA ───────────────────────────────────────────── */}
        <MotionPressable onPress={askAssistant}>
          <LinearGradient
            colors={['#429461', palette.leaf]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 22,
              borderCurve: 'continuous',
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.lg,
            }}
          >
            <View style={{ gap: spacing.sm }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                }}
              >
                <Sparkles
                  color={palette.mintStrong}
                  size={16}
                  strokeWidth={2.2}
                />
                <Text
                  style={{
                    color: palette.mintStrong,
                    fontFamily: typography.bodyStrong,
                    fontSize: 12,
                    letterSpacing: 0.8,
                  }}
                >
                  AI ADVISOR
                </Text>
              </View>
              <Text
                style={{
                  color: palette.white,
                  fontFamily: typography.bodyStrong,
                  fontSize: 16,
                  lineHeight: 24,
                }}
              >
                Should I sell {crop.cropName} now or wait?
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.86)',
                  fontFamily: typography.bodyRegular,
                  fontSize: 13,
                  lineHeight: 21,
                }}
              >
                Get personalised sell/store advice based on current prices and
                trends.
              </Text>
            </View>
          </LinearGradient>
        </MotionPressable>
      </PageShell>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function trendTone(direction: string) {
  if (direction === 'UP') return 'success' as const;
  if (direction === 'DOWN') return 'danger' as const;
  return 'neutral' as const;
}

function SortPill({
  label,
  icon: Icon,
  active,
  onPress,
}: {
  label: string;
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderRadius: radii.pill,
        borderCurve: 'continuous',
        paddingHorizontal: 14,
        paddingVertical: 9,
        backgroundColor: active ? palette.leafMist : '#F5F4F1',
        borderWidth: 1,
        borderColor: active ? 'rgba(30, 94, 59, 0.16)' : 'rgba(30, 42, 34, 0.08)',
      }}
    >
      <Icon color={active ? palette.leafDark : palette.ink} size={13} strokeWidth={2.1} />
      <Text style={{ color: active ? palette.leafDark : palette.ink, fontFamily: typography.bodyStrong, fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}
