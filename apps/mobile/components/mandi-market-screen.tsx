import { Image } from 'expo-image';
import type { Router } from 'expo-router';
import {
  BadgeCheck,
  Bell,
  ChartColumnBig,
  ChevronLeft,
  MapPin,
  Mic,
  Pin,
  Search,
  Sparkles,
  Sprout,
  TrendingDown,
  TrendingUp,
  Wheat,
} from 'lucide-react-native';
import { memo, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatCurrency } from '@/lib/format';
import { palette, typography } from '@/theme/tokens';

const krishiMandiImage = require('../assets/images/market/krishi-mandi.png');
const royalAgroWarehouseImage = require('../assets/images/market/royal-agro-warehouse.png');
const pimpalgaonApmcImage = require('../assets/images/market/pimpalgaon-apmc.png');

type TradeMode = 'buy' | 'sell';
type FilterMode = 'price' | 'distance' | 'verified';

type PinnedCrop = {
  id: string;
  title: string;
  price: number;
  changeLabel: string;
  trendLabel: string;
  trend: 'up' | 'down';
  icon: 'wheat' | 'sprout' | 'field';
};

type NearbyMarketCard = {
  id: string;
  title: string;
  distanceKm: number;
  statusLabel: string;
  statusTone: 'open' | 'closing' | 'verified';
  price: number;
  image: 'market' | 'warehouse' | 'apmc';
  iconTone: 'active' | 'muted';
  detailsRoute: Parameters<Router['push']>[0];
};

type Props = {
  cropName: string;
  insightHeadline: string;
  insightBody: string;
  searchText: string;
  tradeMode: TradeMode;
  filterMode: FilterMode;
  pinnedCrops: PinnedCrop[];
  nearbyCards: NearbyMarketCard[];
  onBackPress: () => void;
  onBellPress: () => void;
  onSearchTextChange: (value: string) => void;
  onTradeModeChange: (value: TradeMode) => void;
  onFilterModeChange: (value: FilterMode) => void;
  onViewAllPinned: () => void;
  onOpenAi: () => void;
  onDetailsPress: (card: NearbyMarketCard) => void;
};

const detailButtonStyle = {
  alignItems: 'center' as const,
  backgroundColor: palette.white,
  borderRadius: 999,
  borderCurve: 'continuous' as const,
  justifyContent: 'center' as const,
  minWidth: 66,
  paddingHorizontal: 12,
  paddingVertical: 4,
};

export const MandiMarketScreen = memo(function MandiMarketScreen({
  cropName,
  insightHeadline,
  insightBody,
  searchText,
  tradeMode,
  filterMode,
  pinnedCrops,
  nearbyCards,
  onBackPress,
  onBellPress,
  onSearchTextChange,
  onTradeModeChange,
  onFilterModeChange,
  onViewAllPinned,
  onOpenAi,
  onDetailsPress,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const frameWidth = Math.min(width, 420);
  const pinnedCardWidth = Math.min(Math.max(frameWidth * 0.41, 148), 160);

  const filteredCards = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    let cards = nearbyCards.filter((card) => {
      if (!query) {
        return true;
      }

      return card.title.toLowerCase().includes(query) || cropName.toLowerCase().includes(query);
    });

    if (filterMode === 'verified') {
      cards = cards.filter((card) => card.statusTone === 'verified');
    }

    if (filterMode === 'distance') {
      cards = [...cards].sort((left, right) => left.distanceKm - right.distanceKm);
    } else {
      cards = [...cards].sort((left, right) => left.price - right.price);
    }

    return cards;
  }, [cropName, filterMode, nearbyCards, searchText]);

  return (
    <View style={{ flex: 1, backgroundColor: palette.white }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{
          alignSelf: 'center',
          gap: 24,
          maxWidth: 420,
          paddingBottom: insets.bottom + 110,
          paddingHorizontal: 16,
          paddingTop: insets.top + 78,
          width: '100%',
        }}
      >
        <View style={{ gap: 12 }}>
          <View
            style={{
              backgroundColor: '#EBECEB',
              borderRadius: 24,
              borderCurve: 'continuous',
              boxShadow: '0 2px 0.5px rgba(0, 0, 0, 0.25)',
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 54,
              paddingHorizontal: 16,
            }}
          >
            <Search color="rgba(0, 0, 0, 0.86)" size={18} strokeWidth={2.2} />
            <TextInput
              onChangeText={onSearchTextChange}
              placeholder="Search crops or markets..."
              placeholderTextColor="rgba(0, 0, 0, 0.64)"
              selectionColor={palette.leafDark}
              style={{
                color: 'rgba(0, 0, 0, 0.84)',
                flex: 1,
                fontFamily: typography.body,
                fontSize: 16,
                paddingHorizontal: 12,
                paddingVertical: 14,
              }}
              value={searchText}
            />
            <Pressable hitSlop={10} onPress={onOpenAi}>
              <Mic color={palette.leafDark} size={18} strokeWidth={2.3} />
            </Pressable>
          </View>

          <View style={{ gap: 10 }}>
            <View
              style={{
                backgroundColor: '#FFFDFD',
                borderRadius: 14,
                borderCurve: 'continuous',
                boxShadow: 'inset 2px 2px 11px rgba(0, 0, 0, 0.12)',
                flexDirection: 'row',
                padding: 4,
              }}
            >
              {(['buy', 'sell'] as const).map((mode) => {
                const active = tradeMode === mode;

                return (
                  <Pressable
                    key={mode}
                    onPress={() => onTradeModeChange(mode)}
                    style={{
                      alignItems: 'center',
                      backgroundColor: active ? palette.leafDark : 'transparent',
                      borderRadius: 8,
                      borderCurve: 'continuous',
                      boxShadow: active ? '0 10px 15px -3px rgba(0, 0, 0, 0.10)' : 'none',
                      flex: 1,
                      justifyContent: 'center',
                      minHeight: 40,
                    }}
                  >
                    <Text
                      style={{
                        color: active ? palette.white : '#050505',
                        fontFamily: active ? typography.bodyStrong : typography.body,
                        fontSize: 14,
                      }}
                    >
                      {mode === 'buy' ? 'Buy' : 'Sell'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingRight: 22 }}
            >
              <FilterChip
                active={filterMode === 'price'}
                icon={<ChartColumnBig color="#111111" size={13} strokeWidth={2.1} />}
                label="Price: Low to High"
                onPress={() => onFilterModeChange('price')}
              />
              <FilterChip
                active={filterMode === 'distance'}
                icon={<MapPin color="#111111" size={13} strokeWidth={2.1} />}
                label="Under 10km"
                onPress={() => onFilterModeChange('distance')}
              />
              <FilterChip
                active={filterMode === 'verified'}
                icon={<BadgeCheck color="#111111" size={13} strokeWidth={2.1} />}
                label="Verified Stores"
                onPress={() => onFilterModeChange('verified')}
              />
            </ScrollView>
          </View>
        </View>

        <View
          style={{
            backgroundColor: '#056B4C',
            borderColor: '#065F46',
            borderRadius: 16,
            borderCurve: 'continuous',
            borderWidth: 1,
            overflow: 'hidden',
            paddingHorizontal: 21,
            paddingVertical: 18,
            position: 'relative',
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: -20,
              top: 24,
              width: 96,
              height: 96,
              borderRadius: 999,
              backgroundColor: 'rgba(102, 221, 139, 0.10)',
            }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Sparkles color={palette.white} size={13} strokeWidth={2.2} />
            <Text
              style={{
                color: palette.white,
                fontFamily: typography.bodyStrong,
                fontSize: 13,
                letterSpacing: 0.5,
                opacity: 0.92,
              }}
            >
              AI MARKET INSIGHT
            </Text>
          </View>
          <Text
            style={{
              color: palette.white,
              fontFamily: 'Sora_700Bold',
              fontSize: 15,
              lineHeight: 24,
              marginBottom: 8,
            }}
          >
            {insightHeadline}
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.92)',
              fontFamily: typography.bodyRegular,
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            {insightBody}
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text
              style={{
                color: '#0A0A0A',
                fontFamily: typography.bodyStrong,
                fontSize: 14,
                letterSpacing: 1.4,
              }}
            >
              YOUR PINNED CROPS
            </Text>
            <Pressable hitSlop={8} onPress={onViewAllPinned}>
              <Text
                style={{
                  color: '#187E37',
                  fontFamily: typography.bodyStrong,
                  fontSize: 12,
                }}
              >
                View All
              </Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
            {pinnedCrops.map((crop) => (
              <PinnedCropCard key={crop.id} crop={crop} width={pinnedCardWidth} />
            ))}
          </ScrollView>
        </View>

        <View style={{ gap: 14 }}>
          <Text
            style={{
              color: '#0A0A0A',
              fontFamily: typography.bodyStrong,
              fontSize: 14,
              letterSpacing: 1.6,
            }}
          >
            NEARBY MARKETS & STORES
          </Text>

          {filteredCards.length ? (
            filteredCards.map((card) => (
              <Pressable
                key={card.id}
                onPress={() => onDetailsPress(card)}
                style={{
                  backgroundColor: '#F2F2F2',
                  borderRadius: 24,
                  borderCurve: 'continuous',
                  flexDirection: 'row',
                  gap: 16,
                  padding: 16,
                }}
              >
                <Image
                  source={resolveCardImage(card.image)}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                  }}
                  contentFit="cover"
                />

                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: '#121212',
                        flex: 1,
                        fontFamily: 'Sora_700Bold',
                        fontSize: 15,
                        lineHeight: 23,
                      }}
                    >
                      {card.title}
                    </Text>
                    <Pin
                      color={card.iconTone === 'active' ? '#056B4C' : '#353535'}
                      size={15}
                      strokeWidth={2.2}
                    />
                  </View>

                  <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <MapPin color="#111111" size={10} strokeWidth={2.1} />
                    <Text
                      style={{
                        color: '#161616',
                        fontFamily: typography.bodyRegular,
                        fontSize: 12,
                      }}
                    >
                      {card.distanceKm.toFixed(1)} km away
                    </Text>
                    <Text style={{ color: '#006D2A', fontSize: 12 }}>•</Text>
                    <Text
                      style={{
                        color: resolveStatusColor(card.statusTone),
                        fontFamily:
                          card.statusTone === 'closing' ? typography.bodyRegular : typography.body,
                        fontSize: 12,
                      }}
                    >
                      {card.statusLabel}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 }}>
                    <View style={{ alignItems: 'baseline', flexDirection: 'row', gap: 3 }}>
                      <Text
                        style={{
                          color: '#006D2A',
                          fontFamily: typography.bodyStrong,
                          fontSize: 14,
                          lineHeight: 20,
                        }}
                      >
                        {formatCurrency(card.price)}
                      </Text>
                      <Text
                        style={{
                          color: '#111111',
                          fontFamily: typography.bodyRegular,
                          fontSize: 10,
                          lineHeight: 15,
                        }}
                      >
                        / quintal
                      </Text>
                    </View>

                    <View style={detailButtonStyle}>
                      <Text
                        style={{
                          color: '#006D2A',
                          fontFamily: typography.bodyStrong,
                          fontSize: 10,
                          letterSpacing: -0.2,
                        }}
                      >
                        DETAILS
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))
          ) : (
            <View
              style={{
                backgroundColor: '#F2F2F2',
                borderRadius: 24,
                borderCurve: 'continuous',
                padding: 18,
              }}
            >
              <Text
                style={{
                  color: '#121212',
                  fontFamily: 'Sora_700Bold',
                  fontSize: 15,
                  marginBottom: 4,
                }}
              >
                No markets matched "{searchText.trim()}"
              </Text>
              <Text
                style={{
                  color: '#565656',
                  fontFamily: typography.bodyRegular,
                  fontSize: 12,
                  lineHeight: 18,
                }}
              >
                Try a crop name, mandi name, or switch the active filter chip.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View
        pointerEvents="box-none"
        style={{
          alignSelf: 'center',
          left: 0,
          maxWidth: 420,
          position: 'absolute',
          right: 0,
          top: 0,
          width: '100%',
        }}
      >
        <View style={{ height: 3, backgroundColor: '#065F46' }} />
        <View
          style={{
            alignItems: 'center',
            backgroundColor: '#FCFDFD',
            borderBottomColor: '#ECECEC',
            borderBottomWidth: 1,
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingBottom: 16,
            paddingHorizontal: 24,
            paddingTop: insets.top + 16,
          }}
        >
          <Pressable hitSlop={12} onPress={onBackPress}>
            <ChevronLeft color="#101010" size={25} strokeWidth={2.3} />
          </Pressable>

          <Text
            style={{
              color: '#111111',
              fontFamily: 'Sora_700Bold',
              fontSize: 18,
              letterSpacing: -0.45,
              lineHeight: 28,
            }}
          >
            Mandi
          </Text>

          <Pressable hitSlop={12} onPress={onBellPress}>
            <Bell color="#101010" size={18} strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>
    </View>
  );
});

function FilterChip({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: active ? 'rgba(30,45,38,0.14)' : 'rgba(30,45,38,0.09)',
        borderColor: 'rgba(121,121,121,0.30)',
        borderRadius: 999,
        borderCurve: 'continuous',
        borderWidth: 1,
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 17,
        paddingVertical: 7,
      }}
    >
      {icon}
      <Text
        style={{
          color: '#111111',
          fontFamily: typography.body,
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PinnedCropCard({ crop, width }: { crop: PinnedCrop; width: number }) {
  const positive = crop.trend === 'up';
  const Icon = crop.icon === 'wheat' ? Wheat : crop.icon === 'sprout' ? Sprout : Sparkles;
  const TrendIcon = positive ? TrendingUp : TrendingDown;

  return (
    <View
      style={{
        backgroundColor: '#F3F4F3',
        borderColor: 'rgba(189, 202, 192, 0.35)',
        borderRadius: 24,
        borderCurve: 'continuous',
        borderWidth: 1,
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
        gap: 12,
        minHeight: 153,
        padding: 16,
        width,
      }}
    >
      <View style={{ alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: 'rgba(192, 204, 200, 0.46)',
            borderRadius: 999,
            height: 40,
            justifyContent: 'center',
            width: 40,
          }}
        >
          <Icon color={positive ? '#1B6B4F' : '#277246'} size={18} strokeWidth={2.1} />
        </View>
        <View
          style={{
            backgroundColor: positive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.10)',
            borderRadius: 999,
            borderCurve: 'continuous',
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text
            style={{
              color: positive ? '#1B6B4F' : '#E11D48',
              fontFamily: typography.bodyStrong,
              fontSize: 10,
            }}
          >
            {crop.changeLabel}
          </Text>
        </View>
      </View>

      <View>
        <Text
          style={{
            color: '#111111',
            fontFamily: 'Sora_700Bold',
            fontSize: 14,
            lineHeight: 20,
            marginBottom: 2,
          }}
        >
          {crop.title}
        </Text>
        <View style={{ alignItems: 'baseline', flexDirection: 'row', gap: 4 }}>
          <Text
            style={{
              color: '#187E37',
              fontFamily: typography.bodyStrong,
              fontSize: 18,
              lineHeight: 28,
            }}
          >
            {formatCurrency(crop.price)}
          </Text>
          <Text
            style={{
              color: '#111111',
              fontFamily: typography.bodyRegular,
              fontSize: 10,
              lineHeight: 15,
            }}
          >
            / quintal
          </Text>
        </View>
      </View>

      <View style={{ alignItems: 'center', flexDirection: 'row', gap: 4 }}>
        <TrendIcon color={positive ? '#1B6B4F' : '#D11F1F'} size={11} strokeWidth={2.3} />
        <Text
          style={{
            color: positive ? '#1B6B4F' : '#D11F1F',
            fontFamily: typography.body,
            fontSize: 10,
          }}
        >
          {crop.trendLabel}
        </Text>
      </View>
    </View>
  );
}

function resolveCardImage(image: NearbyMarketCard['image']): ImageSourcePropType {
  if (image === 'warehouse') {
    return royalAgroWarehouseImage;
  }

  if (image === 'apmc') {
    return pimpalgaonApmcImage;
  }

  return krishiMandiImage;
}

function resolveStatusColor(statusTone: NearbyMarketCard['statusTone']) {
  if (statusTone === 'closing') {
    return '#111111';
  }

  return '#D61F1F';
}
