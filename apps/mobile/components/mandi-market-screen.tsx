import { memo, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { MapPin, Mic, Pin, Search, Store, Wheat } from 'lucide-react-native';

import { Button } from '@/components/button';
import { FilterChipRow } from '@/components/filter-chip-row';
import { InsetCard } from '@/components/inset-card';
import { PageShell } from '@/components/page-shell';
import { SectionTitle } from '@/components/section-title';
import { SelectField } from '@/components/select-field';
import type { MarketExplorerView, MarketPinnedCrop } from '@/lib/market-explorer';
import type { MarketTradeMode } from '@/lib/mock-market-data';
import { formatCurrency, formatDistance } from '@/lib/format';
import { palette, radii, spacing, typography } from '@/theme/tokens';

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
  { value: 'sell', label: 'Sell' },
  { value: 'buy', label: 'Buy' },
];

const viewOptions: Array<{ value: MarketExplorerView; label: string }> = [
  { value: 'crops', label: 'All crops' },
  { value: 'mandis', label: 'Mandis' },
  { value: 'pinned', label: 'Pinned' },
];

export const MandiMarketScreen = memo(function MandiMarketScreen({
  addCropOptions,
  cropItems,
  emptyState,
  mandiItems,
  onAddPinnedCrop,
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
  view,
}: Props) {
  const [pendingCropKey, setPendingCropKey] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeItems = useMemo(() => {
    if (view === 'mandis') {
      return mandiItems;
    }

    return view === 'pinned' ? pinnedItems : cropItems;
  }, [cropItems, mandiItems, pinnedItems, view]);

  return (
    <PageShell
      title="Market"
      subtitle="Track crops, compare nearby mandis, and keep your watchlist focused."
      hero={
        <View style={{ gap: spacing.md }}>
          <View
            style={{
              minHeight: 52,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              paddingHorizontal: spacing.md,
              borderRadius: radii.xl,
              borderCurve: 'continuous',
              backgroundColor: palette.white,
              borderWidth: 1,
              borderColor: palette.outline,
            }}
          >
            <Search color={palette.inkMuted} size={18} />
            <TextInput
              value={searchText}
              onChangeText={onSearchTextChange}
              placeholder="Search crops or mandis"
              placeholderTextColor={palette.inkMuted}
              style={{
                flex: 1,
                color: palette.ink,
                fontFamily: typography.bodyRegular,
                fontSize: 14,
                paddingVertical: spacing.sm,
              }}
            />
            <Pressable onPress={onOpenAi} hitSlop={8}>
              <Mic color={palette.leafDark} size={18} />
            </Pressable>
          </View>

          <FilterChipRow
            value={tradeMode}
            options={tradeModeOptions}
            onChange={onTradeModeChange}
          />

          <FilterChipRow value={view} options={viewOptions} onChange={onViewChange} />
        </View>
      }
    >
      <InsetCard tone="feature" padding={16}>
        <View style={{ gap: spacing.sm }}>
          <Text
            style={{
              color: palette.ink,
              fontFamily: typography.bodyStrong,
              fontSize: 16,
            }}
          >
            {tradeMode === 'sell'
              ? 'Compare the strongest selling prices first.'
              : 'Compare the lowest buying rates first.'}
          </Text>
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 13,
              lineHeight: 20,
            }}
          >
            Switch between all crops, nearby mandis, and your pinned watchlist depending on what you want to decide next.
          </Text>
        </View>
      </InsetCard>

      {view !== 'mandis' ? (
        <InsetCard padding={16}>
          <View style={{ gap: spacing.sm }}>
            <SectionTitle
              eyebrow="Watchlist"
              title="Add a pinned crop"
            />
            <SelectField
              label="Crop"
              value={pendingCropKey}
              options={addCropOptions}
              onChange={setPendingCropKey}
              placeholder={
                addCropOptions.length ? 'Choose a crop to pin' : 'All crops are already pinned'
              }
              open={pickerOpen}
              onOpenChange={setPickerOpen}
            />
            <Button
              label="Add to pinned"
              disabled={!pendingCropKey}
              onPress={() => {
                if (!pendingCropKey) {
                  return;
                }

                onAddPinnedCrop(pendingCropKey);
                setPendingCropKey('');
                setPickerOpen(false);
              }}
            />
          </View>
        </InsetCard>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
        }}
      >
        <Text
          style={{
            color: palette.ink,
            fontFamily: typography.bodyStrong,
            fontSize: 18,
          }}
        >
          {activeItems.length} {view === 'mandis' ? 'mandi' : 'item'}
          {activeItems.length === 1 ? '' : 's'}
        </Text>
        <Button label="Ask AI" fullWidth={false} variant="soft" onPress={onOpenAi} />
      </View>

      <View style={{ gap: spacing.sm }}>
        {view === 'mandis'
          ? mandiItems.length
            ? mandiItems.map((item) => (
                <MandiCard
                  key={item.mandiKey}
                  item={item}
                  onPress={() => onOpenMandi(item)}
                />
              ))
            : (
                <EmptyStateCard emptyState={emptyState} />
              )
          : activeItems.length
            ? (activeItems as MarketCropListItem[]).map((item) => (
                <CropCard
                  key={item.cropKey}
                  item={item}
                  onPress={() => onOpenCrop(item)}
                  onTogglePinned={() => onTogglePinnedCrop(item)}
                />
              ))
            : (
                <EmptyStateCard emptyState={emptyState} />
              )}
      </View>
    </PageShell>
  );
});

function CropCard({
  item,
  onPress,
  onTogglePinned,
}: {
  item: MarketCropListItem;
  onPress: () => void;
  onTogglePinned: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: palette.outline,
        backgroundColor: palette.white,
        padding: spacing.md,
      }}
    >
      <View style={{ gap: spacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing.md,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Wheat color={palette.leafDark} size={18} />
              <Text
                style={{
                  color: palette.ink,
                  fontFamily: typography.bodyStrong,
                  fontSize: 16,
                }}
              >
                {item.cropName}
              </Text>
            </View>
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 12,
              }}
            >
              {item.mandiCount} mandis tracked
            </Text>
          </View>

          <Pressable onPress={onTogglePinned} hitSlop={8}>
            <Pin
              color={item.pinned ? palette.leafDark : palette.inkMuted}
              size={18}
              fill={item.pinned ? palette.leafDark : 'transparent'}
            />
          </Pressable>
        </View>

        <Text
          style={{
            color: palette.ink,
            fontFamily: typography.display,
            fontSize: 22,
          }}
        >
          {item.bestPrice != null ? formatCurrency(item.bestPrice) : 'No live price'}
        </Text>

        <Text
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 13,
            lineHeight: 20,
          }}
        >
          {item.bestMandiName
            ? `Best mandi: ${item.bestMandiName}`
            : 'No mandi price is visible for this crop right now.'}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          <MetaPill label={item.trendLabel} />
          <MetaPill label={item.freshnessLabel} />
          {item.nearestDistanceKm != null ? (
            <MetaPill label={`Nearest ${formatDistance(item.nearestDistanceKm)}`} />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function MandiCard({
  item,
  onPress,
}: {
  item: MarketMandiListItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: palette.outline,
        backgroundColor: palette.white,
        padding: spacing.md,
      }}
    >
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Store color={palette.leafDark} size={18} />
          <Text
            style={{
              color: palette.ink,
              fontFamily: typography.bodyStrong,
              fontSize: 16,
            }}
          >
            {item.mandiName}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <MapPin color={palette.inkMuted} size={14} />
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 12,
            }}
          >
            {item.district}, {item.state}
          </Text>
        </View>

        <Text
          style={{
            color: palette.ink,
            fontFamily: typography.display,
            fontSize: 22,
          }}
        >
          {item.topPrice != null ? formatCurrency(item.topPrice) : 'No live price'}
        </Text>

        <Text
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 13,
            lineHeight: 20,
          }}
        >
          {item.topCropName
            ? `Top crop: ${item.topCropName}`
            : 'No top crop is visible for this mandi right now.'}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          <MetaPill label={item.freshnessLabel} />
          <MetaPill label={`${item.cropCount} crops`} />
          {item.distanceKm != null ? (
            <MetaPill label={formatDistance(item.distanceKm)} />
          ) : null}
          {item.hasLinkedFacility ? <MetaPill label="Facility linked" /> : null}
        </View>
      </View>
    </Pressable>
  );
}

function EmptyStateCard({ emptyState }: { emptyState: EmptyState }) {
  return (
    <InsetCard tone="soft" padding={16}>
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
        {emptyState.actionLabel && emptyState.onAction ? (
          <Button
            label={emptyState.actionLabel}
            fullWidth={false}
            onPress={emptyState.onAction}
          />
        ) : null}
      </View>
    </InsetCard>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: 7,
        borderRadius: radii.pill,
        backgroundColor: palette.leafMist,
      }}
    >
      <Text
        style={{
          color: palette.leafDark,
          fontFamily: typography.bodyStrong,
          fontSize: 11,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
