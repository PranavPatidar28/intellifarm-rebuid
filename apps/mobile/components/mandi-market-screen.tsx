import { type ComponentType, memo, type ReactNode, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowUpDown,
  BarChart3,
  MapPin,
  MapPinned,
  Mic,
  Pin,
  Search,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';

import { AppHeroHeader } from '@/components/app-hero-header';
import { InsetCard } from '@/components/inset-card';
import { MetricBadge } from '@/components/metric-badge';
import { MotionPressable } from '@/components/motion-pressable';
import { SectionHeaderRow } from '@/components/section-header-row';
import type { MarketExplorerView } from '@/lib/market-explorer';
import type { MarketTradeMode } from '@/lib/mock-market-data';
import { formatCurrency, formatDistance } from '@/lib/format';
import { palette, radii, semanticColors, spacing, typography } from '@/theme/tokens';

// ── Public types ────────────────────────────────────────────────────────────

export type MarketCropListItem = {
  cropKey: string;
  cropName: string;
  latestPrice: number | null;
  trendLabel: string;
  freshnessLabel: string;
  bestMandiName: string | null;
  bestPrice: number | null;
  nearestMandiName: string | null;
  nearestDistanceKm: number | null;
  mandiCount: number;
  hasLiveData: boolean;
  pinned: boolean;
};

export type MarketMandiListItem = {
  mandiKey: string;
  mandiName: string;
  district: string;
  state: string;
  distanceKm: number | null;
  cropCount: number;
  topCropName: string | null;
  topPrice: number | null;
  freshnessLabel: string;
  hasLinkedFacility: boolean;
};

type Props = {
  cropItems: MarketCropListItem[];
  isError: boolean;
  isLoading: boolean;
  mandiItems: MarketMandiListItem[];
  onOpenAi: () => void;
  onOpenCrop: (item: MarketCropListItem) => void;
  onOpenMandi: (item: MarketMandiListItem) => void;
  onSearchTextChange: (value: string) => void;
  onTogglePinnedCrop: (item: MarketCropListItem) => void;
  onTradeModeChange: (value: MarketTradeMode) => void;
  onViewChange: (nextView: MarketExplorerView) => void;
  pinnedItems: MarketCropListItem[];
  searchText: string;
  tradeMode: MarketTradeMode;
  view: MarketExplorerView;
};

const tradeModeOptions: Array<{ value: MarketTradeMode; label: string }> = [
  { value: 'buy', label: 'Buy' },
  { value: 'sell', label: 'Sell' },
];

// ── Main component ──────────────────────────────────────────────────────────

export const MandiMarketScreen = memo(function MandiMarketScreen({
  cropItems,
  isError,
  isLoading,
  mandiItems,
  onOpenAi,
  onOpenCrop,
  onOpenMandi,
  onSearchTextChange,
  onTogglePinnedCrop,
  onTradeModeChange,
  pinnedItems,
  searchText,
  tradeMode,
}: Props) {
  const [showNearbyOnly, setShowNearbyOnly] = useState(false);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [showAllCrops, setShowAllCrops] = useState(false);
  const [showAllMandis, setShowAllMandis] = useState(false);

  const INITIAL_CROPS = 5;
  const INITIAL_MANDIS = 4;

  const visibleMandiItems = useMemo(() => {
    return mandiItems.filter((item) => {
      if (showNearbyOnly && (item.distanceKm == null || item.distanceKm > 10)) return false;
      if (showVerifiedOnly && !item.hasLinkedFacility) return false;
      return true;
    });
  }, [mandiItems, showNearbyOnly, showVerifiedOnly]);

  // Sort crops by trade mode
  const sortedCropItems = useMemo(() => {
    return [...cropItems].sort((a, b) => {
      const priceA = a.bestPrice ?? a.latestPrice ?? 0;
      const priceB = b.bestPrice ?? b.latestPrice ?? 0;
      return tradeMode === 'sell' ? priceB - priceA : priceA - priceB;
    });
  }, [cropItems, tradeMode]);

  // Slice for progressive disclosure
  const displayedCrops = showAllCrops ? sortedCropItems : sortedCropItems.slice(0, INITIAL_CROPS);
  const displayedMandis = showAllMandis ? visibleMandiItems : visibleMandiItems.slice(0, INITIAL_MANDIS);
  const hasMoreCrops = sortedCropItems.length > INITIAL_CROPS;
  const hasMoreMandis = visibleMandiItems.length > INITIAL_MANDIS;

  // Snapshot stats
  const totalCrops = cropItems.length;
  const totalMandis = mandiItems.length;
  const topCrop = sortedCropItems[0] ?? null;

  // ── Hero header ─────────────────────────────────────────────────────

  const heroContent = (
    <View style={{ gap: spacing.md }}>
      <View
        style={{
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: 18,
          borderRadius: 22,
          borderCurve: 'continuous',
          backgroundColor: palette.white,
          borderWidth: 1,
          borderColor: palette.outline,
          boxShadow: '0 10px 22px rgba(31, 46, 36, 0.08)',
        }}
      >
        <Search color={palette.ink} size={20} strokeWidth={2} />
        <TextInput
          value={searchText}
          onChangeText={onSearchTextChange}
          placeholder="Search crops or markets..."
          placeholderTextColor={palette.inkSoft}
          style={{
            flex: 1,
            color: palette.ink,
            fontFamily: typography.bodyRegular,
            fontSize: 15,
            paddingVertical: spacing.sm,
          }}
        />
        <MotionPressable onPress={onOpenAi} hitSlop={8}>
          <Mic color={palette.leafDark} size={18} strokeWidth={2.1} />
        </MotionPressable>
      </View>

      <SegmentedControl value={tradeMode} options={tradeModeOptions} onChange={onTradeModeChange} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.xs }}
      >
        <FilterPill
          active={tradeMode === 'buy'}
          icon={ArrowUpDown}
          label={tradeMode === 'buy' ? 'Price: Low to High' : 'Price: High to Low'}
          onPress={() => onTradeModeChange(tradeMode === 'buy' ? 'sell' : 'buy')}
        />
        <FilterPill
          active={showNearbyOnly}
          icon={MapPin}
          label="Under 10km"
          onPress={() => setShowNearbyOnly((v) => !v)}
        />
        <FilterPill
          active={showVerifiedOnly}
          icon={MapPinned}
          label="Verified"
          onPress={() => setShowVerifiedOnly((v) => !v)}
        />
      </ScrollView>
    </View>
  );

  // ── Body ────────────────────────────────────────────────────────────

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: palette.canvas }}
      contentContainerStyle={{ paddingBottom: 132, backgroundColor: palette.canvas }}
    >
      <AppHeroHeader
        title="Mandi"
        subtitle="Compare crops, nearby mandis, and storage options."
        hero={heroContent}
        tone="market"
      />

      <View style={{ gap: spacing.xl, paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        {/* ── Loading / Error states ──────────────────────────────── */}
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator color={palette.leafDark} size="large" />
            <Text style={{ color: palette.inkSoft, fontFamily: typography.bodyRegular, fontSize: 14, marginTop: spacing.md }}>
              Fetching latest mandi prices…
            </Text>
          </View>
        ) : isError ? (
          <InsetCard tone="alert" padding={20}>
            <View style={{ gap: spacing.sm }}>
              <Text style={{ color: palette.ink, fontFamily: typography.bodyStrong, fontSize: 16 }}>
                Could not load market data
              </Text>
              <Text style={{ color: palette.inkSoft, fontFamily: typography.bodyRegular, fontSize: 13, lineHeight: 20 }}>
                Please check your internet connection and try again.
              </Text>
            </View>
          </InsetCard>
        ) : (
          <>
            {/* ── 1. TODAY'S MARKET SNAPSHOT ────────────────────── */}
            <MarketSnapshotCard totalCrops={totalCrops} totalMandis={totalMandis} topCrop={topCrop} />

            {/* ── 2. PINNED CROPS (only when actually pinned) ──── */}
            {pinnedItems.length > 0 ? (
              <View style={{ gap: spacing.md }}>
                <SectionHeaderRow eyebrow="Watchlist" title="Pinned Crops" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
                >
                  {pinnedItems.map((item) => (
                    <PinnedCropCard
                      key={item.cropKey}
                      item={item}
                      onPress={() => onOpenCrop(item)}
                      onTogglePin={() => onTogglePinnedCrop(item)}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* ── 3. TOP CROPS TODAY ────────────────────────────── */}
            <View style={{ gap: spacing.md }}>
              <SectionHeaderRow
                eyebrow={`${totalCrops} commodities`}
                title={tradeMode === 'sell' ? 'Best Selling Prices' : 'Best Buying Prices'}
              />
              {displayedCrops.length ? (
                displayedCrops.map((item) => (
                  <CropPriceCard
                    key={item.cropKey}
                    item={item}
                    onPress={() => onOpenCrop(item)}
                    onTogglePin={() => onTogglePinnedCrop(item)}
                  />
                ))
              ) : (
                <EmptyCard title="No crops found" description="Try a different search term." />
              )}
              {hasMoreCrops && !showAllCrops ? (
                <ViewAllButton
                  label={`View all ${totalCrops} crops`}
                  onPress={() => setShowAllCrops(true)}
                />
              ) : null}
            </View>

            {/* ── 4. NEARBY MANDIS ─────────────────────────────── */}
            <View style={{ gap: spacing.md }}>
              <SectionHeaderRow eyebrow={`${visibleMandiItems.length} markets`} title="Nearby Mandis" />
              {displayedMandis.length ? (
                displayedMandis.map((item) => (
                  <MandiCard key={item.mandiKey} item={item} onPress={() => onOpenMandi(item)} />
                ))
              ) : (
                <EmptyCard title="No mandis found" description="Adjust filters or try a different search." />
              )}
              {hasMoreMandis && !showAllMandis ? (
                <ViewAllButton
                  label={`View all ${visibleMandiItems.length} mandis`}
                  onPress={() => setShowAllMandis(true)}
                />
              ) : null}
            </View>

            {/* ── 5. ASK AI CTA ────────────────────────────────── */}
            <MotionPressable onPress={onOpenAi}>
              <LinearGradient
                colors={['#429461', palette.leaf]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 22,
                  borderCurve: 'continuous',
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.lg,
                  boxShadow: '0 16px 28px rgba(30, 94, 59, 0.18)',
                }}
              >
                <View style={{ gap: spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <Sparkles color={palette.mintStrong} size={16} strokeWidth={2.2} />
                    <Text style={{ color: palette.mintStrong, fontFamily: typography.bodyStrong, fontSize: 12, letterSpacing: 0.8 }}>
                      AI MARKET ADVISOR
                    </Text>
                  </View>
                  <Text style={{ color: palette.white, fontFamily: typography.bodyStrong, fontSize: 16, lineHeight: 24 }}>
                    Should I sell now, store, or wait?
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.86)', fontFamily: typography.bodyRegular, fontSize: 13, lineHeight: 21 }}>
                    Ask the AI assistant for personalised advice based on current mandi prices and trends.
                  </Text>
                </View>
              </LinearGradient>
            </MotionPressable>
          </>
        )}
      </View>
    </ScrollView>
  );
});

// ── Section: Market Snapshot ─────────────────────────────────────────────────

function MarketSnapshotCard({
  totalCrops,
  totalMandis,
  topCrop,
}: {
  totalCrops: number;
  totalMandis: number;
  topCrop: MarketCropListItem | null;
}) {
  return (
    <InsetCard tone="feature" padding={16}>
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <BarChart3 color={palette.leafDark} size={16} strokeWidth={2.2} />
          <Text style={{ color: palette.leafDark, fontFamily: typography.bodyStrong, fontSize: 12, letterSpacing: 0.8 }}>
            TODAY'S SNAPSHOT
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <MetricBadge label={`${totalCrops} crops`} tone="info" />
          <MetricBadge label={`${totalMandis} mandis`} tone="success" />
          {topCrop?.bestPrice != null ? (
            <MetricBadge label={`Top: ${topCrop.cropName} ${formatCurrency(topCrop.bestPrice)}`} tone="warning" />
          ) : null}
        </View>
        {topCrop?.bestMandiName ? (
          <Text style={{ color: palette.inkSoft, fontFamily: typography.bodyRegular, fontSize: 13, lineHeight: 20 }}>
            Best price at {topCrop.bestMandiName} • {topCrop.freshnessLabel}
          </Text>
        ) : null}
      </View>
    </InsetCard>
  );
}

// ── Section: Pinned Crop Card ────────────────────────────────────────────────

function PinnedCropCard({
  item,
  onPress,
  onTogglePin,
}: {
  item: MarketCropListItem;
  onPress: () => void;
  onTogglePin: () => void;
}) {
  const trendColor = item.trendLabel.toLowerCase().includes('up')
    ? palette.leafDark
    : item.trendLabel.toLowerCase().includes('down')
      ? semanticColors.danger
      : palette.inkSoft;

  return (
    <MotionPressable
      onPress={onPress}
      contentStyle={{
        width: 160,
        borderRadius: 22,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: 'rgba(30, 42, 34, 0.08)',
        backgroundColor: palette.white,
        padding: 16,
        boxShadow: '0 12px 20px rgba(31, 46, 36, 0.10)',
      }}
    >
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: palette.ink, fontFamily: typography.bodyStrong, fontSize: 14, flex: 1 }} numberOfLines={1}>
            {item.cropName}
          </Text>
          <MotionPressable onPress={(e) => { e.stopPropagation(); onTogglePin(); }} hitSlop={8}>
            <Pin color={palette.leafDark} size={14} fill={palette.leafDark} />
          </MotionPressable>
        </View>
        <Text style={{ color: palette.leafDark, fontFamily: typography.display, fontSize: 17 }}>
          {item.bestPrice != null ? formatCurrency(item.bestPrice) : 'No price'}
          <Text style={{ color: palette.ink, fontFamily: typography.bodyRegular, fontSize: 11 }}> /qtl</Text>
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {item.trendLabel.toLowerCase().includes('up') ? (
            <TrendingUp color={trendColor} size={12} strokeWidth={2.2} />
          ) : item.trendLabel.toLowerCase().includes('down') ? (
            <TrendingDown color={trendColor} size={12} strokeWidth={2.2} />
          ) : null}
          <Text style={{ color: trendColor, fontFamily: typography.bodyRegular, fontSize: 11 }}>
            {item.trendLabel}
          </Text>
        </View>
      </View>
    </MotionPressable>
  );
}

// ── Section: Crop Price Card ─────────────────────────────────────────────────

const CropPriceCard = memo(function CropPriceCard({
  item,
  onPress,
  onTogglePin,
}: {
  item: MarketCropListItem;
  onPress: () => void;
  onTogglePin: () => void;
}) {
  const trendTone = item.trendLabel.toLowerCase().includes('up')
    ? ('success' as const)
    : item.trendLabel.toLowerCase().includes('down')
      ? ('danger' as const)
      : ('neutral' as const);

  return (
    <Pressable onPress={onPress}>
      <LightCard>
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: palette.ink, fontFamily: typography.bodyStrong, fontSize: 16, lineHeight: 21 }}>
                {item.cropName}
              </Text>
              {item.bestMandiName ? (
                <Text style={{ color: palette.inkSoft, fontFamily: typography.bodyRegular, fontSize: 12 }}>
                  Best at {item.bestMandiName}
                </Text>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <MetricBadge label={item.trendLabel} tone={trendTone} />
              <Pressable onPress={onTogglePin} hitSlop={8}>
                <Pin
                  color={item.pinned ? palette.leafDark : palette.inkMuted}
                  size={16}
                  strokeWidth={2.1}
                  fill={item.pinned ? palette.leafDark : 'transparent'}
                />
              </Pressable>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <View style={{ alignItems: 'baseline', flexDirection: 'row', gap: 4 }}>
              <Text style={{ color: palette.leafDark, fontFamily: typography.display, fontSize: 22, fontVariant: ['tabular-nums'] }}>
                {item.bestPrice != null ? formatCurrency(item.bestPrice) : '—'}
              </Text>
              <Text style={{ color: palette.inkSoft, fontFamily: typography.bodyRegular, fontSize: 11 }}>/ qtl</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Store color={palette.inkMuted} size={12} strokeWidth={2.1} />
              <Text style={{ color: palette.inkMuted, fontFamily: typography.bodyRegular, fontSize: 12 }}>
                {item.mandiCount} {item.mandiCount === 1 ? 'mandi' : 'mandis'}
              </Text>
            </View>
          </View>

          <Text style={{ color: palette.inkMuted, fontFamily: typography.bodyRegular, fontSize: 11, lineHeight: 16 }}>
            {item.freshnessLabel}
            {item.nearestMandiName && item.nearestDistanceKm != null
              ? ` • Nearest: ${item.nearestMandiName} (${formatDistance(item.nearestDistanceKm)})`
              : ''}
          </Text>
        </View>
      </LightCard>
    </Pressable>
  );
}
);

// ── Section: Mandi Card ──────────────────────────────────────────────────────

const MandiCard = memo(function MandiCard({ item, onPress }: { item: MarketMandiListItem; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <LightCard>
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: palette.ink, fontFamily: typography.bodyStrong, fontSize: 15, lineHeight: 21 }}>
                {item.mandiName}
              </Text>
              <Text style={{ color: palette.inkSoft, fontFamily: typography.bodyRegular, fontSize: 12 }}>
                {item.district}, {item.state}
              </Text>
            </View>
            {item.hasLinkedFacility ? <MetricBadge label="Verified" tone="success" /> : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {item.topCropName && item.topPrice != null ? (
              <View style={{ gap: 2 }}>
                <Text style={{ color: palette.leafDark, fontFamily: typography.display, fontSize: 18, fontVariant: ['tabular-nums'] }}>
                  {formatCurrency(item.topPrice)}
                  <Text style={{ color: palette.inkSoft, fontFamily: typography.bodyRegular, fontSize: 11 }}> /qtl</Text>
                </Text>
                <Text style={{ color: palette.inkMuted, fontFamily: typography.bodyRegular, fontSize: 11 }}>
                  Top: {item.topCropName} • {item.cropCount} {item.cropCount === 1 ? 'crop' : 'crops'}
                </Text>
              </View>
            ) : (
              <Text style={{ color: palette.inkMuted, fontFamily: typography.bodyRegular, fontSize: 12 }}>
                {item.cropCount} {item.cropCount === 1 ? 'crop' : 'crops'} reporting
              </Text>
            )}

            {item.distanceKm != null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MapPin color={palette.inkMuted} size={13} strokeWidth={2.1} />
                <Text style={{ color: palette.inkSoft, fontFamily: typography.bodyRegular, fontSize: 12 }}>
                  {formatDistance(item.distanceKm)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </LightCard>
    </Pressable>
  );
}
);

// ── Lightweight card (no boxShadow for perf) ────────────────────────────────

function LightCard({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        padding: 16,
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: palette.outline,
        backgroundColor: palette.white,
      }}
    >
      {children}
    </View>
  );
}

// ── Shared small components ──────────────────────────────────────────────────

function ViewAllButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <MotionPressable
      onPress={onPress}
      contentStyle={{
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        backgroundColor: palette.leafMist,
        borderWidth: 1,
        borderColor: 'rgba(30, 94, 59, 0.12)',
      }}
    >
      <Text style={{ color: palette.leafDark, fontFamily: typography.bodyStrong, fontSize: 14 }}>
        {label}
      </Text>
    </MotionPressable>
  );
}

function EmptyCard({ title, description }: { title: string; description: string }) {
  return (
    <InsetCard tone="soft" padding={16}>
      <View style={{ gap: spacing.sm }}>
        <Text style={{ color: palette.ink, fontFamily: typography.bodyStrong, fontSize: 16 }}>{title}</Text>
        <Text style={{ color: palette.inkSoft, fontFamily: typography.bodyRegular, fontSize: 13, lineHeight: 20 }}>{description}</Text>
      </View>
    </InsetCard>
  );
}

function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: MarketTradeMode;
  options: Array<{ value: MarketTradeMode; label: string }>;
  onChange: (value: MarketTradeMode) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        padding: 4,
        borderRadius: 18,
        borderCurve: 'continuous',
        backgroundColor: palette.white,
        borderWidth: 1,
        borderColor: 'rgba(30, 42, 34, 0.08)',
        boxShadow: '0 8px 18px rgba(31, 46, 36, 0.08)',
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <MotionPressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{ flex: 1 }}
            contentStyle={{
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: active ? palette.leafDark : 'transparent',
              paddingVertical: 10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: active ? palette.white : palette.ink, fontFamily: typography.bodyStrong, fontSize: 16 }}>
              {option.label}
            </Text>
          </MotionPressable>
        );
      })}
    </View>
  );
}

function FilterPill({
  active,
  icon: Icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      onPress={onPress}
      contentStyle={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: radii.pill,
        borderCurve: 'continuous',
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: active ? palette.leafMist : '#F5F4F1',
        borderWidth: 1,
        borderColor: active ? 'rgba(30, 94, 59, 0.16)' : 'rgba(30, 42, 34, 0.08)',
      }}
    >
      <Icon color={active ? palette.leafDark : palette.ink} size={14} strokeWidth={2.1} />
      <Text style={{ color: palette.ink, fontFamily: typography.bodyRegular, fontSize: 14 }}>{label}</Text>
    </MotionPressable>
  );
}
