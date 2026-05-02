import { memo, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { Image } from 'expo-image';
import {
  ArrowUpDown,
  Bell,
  MapPin,
  MapPinned,
  Mic,
  Pin,
  Search,
  Sparkles,
  Sprout,
  Wheat,
} from 'lucide-react-native';

import { AppHeroHeader } from '@/components/app-hero-header';
import { MotionPressable } from '@/components/motion-pressable';
import type { MarketExplorerView } from '@/lib/market-explorer';
import type { MarketTradeMode } from '@/lib/mock-market-data';
import { formatCurrency, formatDistance } from '@/lib/format';
import { palette, radii, semanticColors, spacing, typography } from '@/theme/tokens';

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

type EmptyState = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

type Props = {
  addCropOptions: Array<{ value: string; label: string }>;
  cropItems: MarketCropListItem[];
  emptyState: EmptyState;
  mandiItems: MarketMandiListItem[];
  onAddPinnedCrop: (cropKey: string) => void;
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

const FEATURED_MANDI_ART = [
  {
    title: 'Krishi Mandi Nashik',
    distanceLabel: '4.2 km away',
    statusLabel: 'Open now',
    statusColor: semanticColors.danger,
    pinned: true,
    imageSource: require('../assets/images/market/krishi-mandi.png'),
  },
  {
    title: 'Krishi Mandi Nashik',
    distanceLabel: '4.2 km away',
    statusLabel: 'Open now',
    statusColor: semanticColors.danger,
    pinned: true,
    imageSource: require('../assets/images/market/krishi-mandi.png'),
  },
  {
    title: 'Royal Agro Warehouse',
    distanceLabel: '6.8 km away',
    statusLabel: 'Closes at 6 PM',
    statusColor: palette.ink,
    pinned: false,
    imageSource: require('../assets/images/market/royal-agro-warehouse.png'),
  },
  {
    title: 'Royal Agro Warehouse',
    distanceLabel: '6.8 km away',
    statusLabel: 'Closes at 6 PM',
    statusColor: palette.ink,
    pinned: false,
    imageSource: require('../assets/images/market/royal-agro-warehouse.png'),
  },
  {
    title: 'Pimpalgaon APMC',
    distanceLabel: '12.5 km away',
    statusLabel: 'Verified',
    statusColor: semanticColors.danger,
    pinned: false,
    imageSource: require('../assets/images/market/pimpalgaon-apmc.png'),
  },
] as const;

export const MandiMarketScreen = memo(function MandiMarketScreen({
  cropItems,
  emptyState,
  mandiItems,
  onOpenAi,
  onOpenCrop,
  onOpenMandi,
  onSearchTextChange,
  onTogglePinnedCrop,
  onTradeModeChange,
  onViewChange,
  pinnedItems,
  searchText,
  tradeMode,
  view: _view,
}: Props) {
  const [showNearbyOnly, setShowNearbyOnly] = useState(false);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const trimmedSearchText = searchText.trim();

  const featuredPinnedItems = useMemo(() => {
    if (pinnedItems.length) {
      return pinnedItems;
    }

    const preferredOrder = ['Wheat', 'Paddy'];
    const prioritized = preferredOrder
      .map((cropName) => cropItems.find((item) => item.cropName === cropName))
      .filter((item): item is MarketCropListItem => Boolean(item));

    const seen = new Set(prioritized.map((item) => item.cropKey));
    const fallback = cropItems.filter((item) => !seen.has(item.cropKey));
    return [...prioritized, ...fallback];
  }, [cropItems, pinnedItems]);

  const visibleMandiItems = useMemo(() => {
    return mandiItems.filter((item) => {
      if (showNearbyOnly && (item.distanceKm == null || item.distanceKm > 10)) {
        return false;
      }

      if (showVerifiedOnly && !item.hasLinkedFacility) {
        return false;
      }

      return true;
    });
  }, [mandiItems, showNearbyOnly, showVerifiedOnly]);

  const hasSearchResults = Boolean(trimmedSearchText.length);
  const marketCards = useMemo(() => {
    return visibleMandiItems.slice(0, 5).map((item, index) => {
      const seed = FEATURED_MANDI_ART[index] ?? FEATURED_MANDI_ART[FEATURED_MANDI_ART.length - 1];

      return {
        item,
        title: hasSearchResults ? item.mandiName : seed.title,
        distanceLabel:
          hasSearchResults && item.distanceKm != null
            ? `${formatDistance(item.distanceKm)} away`
            : seed.distanceLabel,
        statusLabel: hasSearchResults
          ? item.hasLinkedFacility
            ? 'Verified'
            : 'Closes at 6 PM'
          : seed.statusLabel,
        statusColor: hasSearchResults
          ? item.hasLinkedFacility
            ? semanticColors.danger
            : palette.ink
          : seed.statusColor,
        pinned: hasSearchResults ? item.hasLinkedFacility : seed.pinned,
        imageSource: seed.imageSource,
      };
    });
  }, [hasSearchResults, visibleMandiItems]);

  const headerAction = (
    <HeaderActionButton icon={<Bell color={palette.leafDark} size={18} />} onPress={() => {}} />
  );

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

      <SegmentedControl
        value={tradeMode}
        options={tradeModeOptions}
        onChange={onTradeModeChange}
      />

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
          onPress={() => setShowNearbyOnly((value) => !value)}
        />
        <FilterPill
          active={showVerifiedOnly}
          icon={MapPinned}
          label="Verified"
          onPress={() => setShowVerifiedOnly((value) => !value)}
        />
      </ScrollView>
    </View>
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: palette.canvas }}
      contentContainerStyle={{
        paddingBottom: 132,
        backgroundColor: palette.canvas,
      }}
    >
      <AppHeroHeader
        title="Mandi"
        subtitle="Compare crops, nearby mandis, and storage options."
        hero={heroContent}
        action={headerAction}
        tone="market"
      />

      <View
        style={{
          gap: spacing.lg,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
        }}
      >
          <View
            style={{
              borderRadius: 22,
              borderCurve: 'continuous',
              backgroundColor: palette.leafDark,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.lg,
              boxShadow: '0 16px 28px rgba(30, 94, 59, 0.18)',
            }}
          >
            <View style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Sparkles color={palette.mintStrong} size={16} strokeWidth={2.2} />
                <Text
                  style={{
                    color: palette.mintStrong,
                    fontFamily: typography.bodyStrong,
                    fontSize: 12,
                    letterSpacing: 0.8,
                  }}
                >
                  AI MARKET INSIGHT
                </Text>
              </View>
              <Text
                style={{
                  color: palette.white,
                  fontFamily: typography.bodyStrong,
                  fontSize: 16,
                  lineHeight: 26,
                }}
              >
                Wheat prices in Nashik expected to rise by 8% next week.
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.86)',
                  fontFamily: typography.bodyRegular,
                  fontSize: 13,
                  lineHeight: 21,
                }}
              >
                Recommendation: Hold current stock for 5-7 days for better margins.
              </Text>
            </View>
          </View>

          <View style={{ gap: spacing.md }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <SectionEyebrow label="YOUR PINNED CROPS" />
              <MotionPressable onPress={() => onViewChange('pinned')} hitSlop={8}>
                <Text
                  style={{
                    color: palette.leafDark,
                    fontFamily: typography.bodyStrong,
                    fontSize: 14,
                  }}
                >
                  View All
                </Text>
              </MotionPressable>
            </View>

            {featuredPinnedItems.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.lg }}
              >
                {featuredPinnedItems.slice(0, 4).map((item, index) => (
                  <PinnedCropCard
                    key={item.cropKey}
                    item={item}
                    index={index}
                    useReferenceCopy={!hasSearchResults}
                    onPress={() => onOpenCrop(item)}
                    onTogglePinned={() => onTogglePinnedCrop(item)}
                  />
                ))}
              </ScrollView>
            ) : (
              <EmptyStateCard emptyState={emptyState} />
            )}
          </View>

          <View style={{ gap: spacing.md }}>
            <SectionEyebrow label="NEARBY MARKETS & STORES" />

            {marketCards.length ? (
              <View style={{ gap: spacing.md }}>
                {marketCards.map((card) => (
                  <NearbyMarketCard
                    key={card.item.mandiKey}
                    item={card.item}
                    title={card.title}
                    distanceLabel={card.distanceLabel}
                    statusLabel={card.statusLabel}
                    statusColor={card.statusColor}
                    imageSource={card.imageSource}
                    pinned={card.pinned}
                    onPress={() => onOpenMandi(card.item)}
                  />
                ))}
              </View>
            ) : (
              <EmptyStateCard emptyState={emptyState} />
            )}
          </View>
      </View>
    </ScrollView>
  );
});

function HeaderActionButton({
  icon,
  onPress,
}: {
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      onPress={onPress}
      contentStyle={{
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.xl,
        backgroundColor: palette.white,
        borderWidth: 1,
        borderColor: palette.outline,
      }}
    >
      {icon}
    </MotionPressable>
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
            <Text
              style={{
                color: active ? palette.white : palette.ink,
                fontFamily: typography.bodyStrong,
                fontSize: 16,
              }}
            >
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
      <Text
        style={{
          color: palette.ink,
          fontFamily: typography.bodyRegular,
          fontSize: 14,
        }}
      >
        {label}
      </Text>
    </MotionPressable>
  );
}

function PinnedCropCard({
  item,
  index,
  useReferenceCopy,
  onPress,
  onTogglePinned,
}: {
  item: MarketCropListItem;
  index: number;
  useReferenceCopy: boolean;
  onPress: () => void;
  onTogglePinned: () => void;
}) {
  const cropVisual = getPinnedCropVisual(item, index, useReferenceCopy);

  return (
    <MotionPressable
      onPress={onPress}
      contentStyle={{
        width: 160,
        borderRadius: 24,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: 'rgba(30, 42, 34, 0.08)',
        backgroundColor: palette.white,
        padding: 16,
        boxShadow: '0 12px 20px rgba(31, 46, 36, 0.10)',
      }}
    >
      <View style={{ gap: spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#F2F3EF',
            }}
          >
            <cropVisual.Icon color={palette.leafDark} size={18} strokeWidth={2.1} />
          </View>

          <View
            style={{
              borderRadius: radii.pill,
              backgroundColor: cropVisual.badgeBackground,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                color: cropVisual.badgeColor,
                fontFamily: typography.bodyStrong,
                fontSize: 11,
              }}
            >
              {cropVisual.badgeLabel}
            </Text>
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <Text
            style={{
              color: palette.ink,
              fontFamily: typography.bodyStrong,
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            {cropVisual.title}
          </Text>
          <Text
            style={{
              color: palette.leafDark,
              fontFamily: typography.display,
              fontSize: 17,
              lineHeight: 24,
            }}
          >
            {item.bestPrice != null ? formatCurrency(item.bestPrice) : 'No price'}
            <Text
              style={{
                color: palette.ink,
                fontFamily: typography.bodyRegular,
                fontSize: 12,
              }}
            >
              {' '}
              / quintal
            </Text>
          </Text>
          <Text
            style={{
              color: cropVisual.footerColor,
              fontFamily: typography.bodyRegular,
              fontSize: 12,
            }}
          >
            {cropVisual.footerLabel}
          </Text>
        </View>

        {item.pinned ? (
          <MotionPressable
            onPress={(event) => {
              event.stopPropagation();
              onTogglePinned();
            }}
            hitSlop={8}
            contentStyle={{
              position: 'absolute',
              right: 14,
              bottom: 14,
            }}
          >
            <Pin color={palette.leafDark} size={16} fill={palette.leafDark} />
          </MotionPressable>
        ) : null}
      </View>
    </MotionPressable>
  );
}

function NearbyMarketCard({
  item,
  title,
  distanceLabel,
  statusLabel,
  statusColor,
  imageSource,
  pinned,
  onPress,
}: {
  item: MarketMandiListItem;
  title: string;
  distanceLabel: string;
  statusLabel: string;
  statusColor: string;
  imageSource: number;
  pinned: boolean;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      onPress={onPress}
      contentStyle={{
        borderRadius: 24,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: 'rgba(30, 42, 34, 0.08)',
        backgroundColor: '#F6F5F2',
        padding: 14,
      }}
    >
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Image
            source={imageSource}
            contentFit="cover"
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: palette.white,
            }}
          />

          <View style={{ flex: 1, gap: 3 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: spacing.sm,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  color: palette.ink,
                  fontFamily: typography.bodyStrong,
                  fontSize: 15,
                  lineHeight: 21,
                }}
              >
                {title}
              </Text>

              <Pin
                color={pinned ? palette.leafDark : palette.inkMuted}
                size={16}
                strokeWidth={2.1}
                fill={pinned ? palette.leafDark : 'transparent'}
              />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MapPin color={palette.ink} size={12} strokeWidth={2.2} />
              <Text
                style={{
                  color: palette.ink,
                  fontFamily: typography.bodyRegular,
                  fontSize: 12,
                }}
              >
                {distanceLabel}
              </Text>
              <Text style={{ color: palette.leafDark, fontSize: 10 }}>|</Text>
              <Text
                style={{
                  color: statusColor,
                  fontFamily: typography.bodyRegular,
                  fontSize: 12,
                }}
              >
                {statusLabel}
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.sm,
                paddingTop: 2,
              }}
            >
              <Text
                style={{
                  color: palette.leafDark,
                  fontFamily: typography.display,
                  fontSize: 16,
                }}
              >
                {item.topPrice != null ? formatCurrency(item.topPrice) : 'No price'}
                <Text
                  style={{
                    color: palette.ink,
                    fontFamily: typography.bodyRegular,
                    fontSize: 12,
                  }}
                >
                  {' '}
                  / quintal
                </Text>
              </Text>

              <View
                style={{
                  borderRadius: radii.pill,
                  backgroundColor: palette.white,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                }}
              >
                <Text
                  style={{
                    color: palette.leafDark,
                    fontFamily: typography.bodyStrong,
                    fontSize: 11,
                  }}
                >
                  DETAILS
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </MotionPressable>
  );
}

function EmptyStateCard({ emptyState }: { emptyState: EmptyState }) {
  return (
    <View
      style={{
        borderRadius: 22,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: 'rgba(30, 42, 34, 0.08)',
        backgroundColor: '#F6F5F2',
        padding: 16,
      }}
    >
      <View style={{ gap: spacing.sm }}>
        <Text
          style={{
            color: palette.ink,
            fontFamily: typography.bodyStrong,
            fontSize: 16,
          }}
        >
          {emptyState.title}
        </Text>
        <Text
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 13,
            lineHeight: 20,
          }}
        >
          {emptyState.description}
        </Text>
      </View>
    </View>
  );
}

function SectionEyebrow({ label }: { label: string }) {
  return (
    <Text
      style={{
        color: palette.ink,
        fontFamily: typography.bodyStrong,
        fontSize: 12,
        letterSpacing: 1.4,
      }}
    >
      {label}
    </Text>
  );
}

function getPinnedCropVisual(
  item: MarketCropListItem,
  index: number,
  useReferenceCopy: boolean,
) {
  const lowerName = item.cropName.toLowerCase();
  const looksLikeWheat = lowerName.includes('wheat');
  const looksLikeRice = lowerName.includes('paddy') || lowerName.includes('rice');

  const title = useReferenceCopy
    ? looksLikeWheat
      ? 'Wheat (Sonalika)'
      : looksLikeRice
        ? 'Basmati Rice'
        : item.cropName
    : item.cropName;

  if (looksLikeWheat) {
    return {
      title,
      badgeLabel: '+1.2%',
      badgeBackground: '#DDF1E5',
      badgeColor: palette.leafDark,
      footerLabel: 'Trending Up',
      footerColor: palette.leafDark,
      Icon: Wheat,
    };
  }

  if (looksLikeRice || index === 1) {
    return {
      title,
      badgeLabel: '-0.8%',
      badgeBackground: '#FDE8E4',
      badgeColor: semanticColors.danger,
      footerLabel: 'Minor Dip',
      footerColor: semanticColors.danger,
      Icon: Sprout,
    };
  }

  return {
    title,
    badgeLabel: '+0.6%',
    badgeBackground: '#EEF2F8',
    badgeColor: palette.storm,
    footerLabel: item.trendLabel,
    footerColor: palette.inkSoft,
    Icon: Sprout,
  };
}
