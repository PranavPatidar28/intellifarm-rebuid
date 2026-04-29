import { useMemo, useState } from 'react';

import { useRouter } from 'expo-router';

import { MandiMarketScreen } from '@/components/mandi-market-screen';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { apiGet } from '@/lib/api';
import type { FacilitiesResponse, MarketsResponse } from '@/lib/api-types';
import { findSeasonContext } from '@/lib/domain';
import { storageKeys } from '@/lib/constants';
import { useStoredValue } from '@/lib/storage';

type TradeMode = 'buy' | 'sell';
type FilterMode = 'price' | 'distance' | 'verified';

export default function MarketRoute() {
  const router = useRouter();
  const { profile, token } = useSession();
  const { location } = useDeviceLocation();
  const [selectedSeasonId] = useStoredValue(storageKeys.selectedSeasonId, '');
  const [tradeMode, setTradeMode] = useState<TradeMode>('buy');
  const [filterMode, setFilterMode] = useState<FilterMode>('price');
  const [searchText, setSearchText] = useState('');

  const selectedSeason = findSeasonContext(profile, selectedSeasonId);
  const plotLocation =
    selectedSeason?.farmPlot.latitude != null && selectedSeason?.farmPlot.longitude != null
      ? {
          latitude: selectedSeason.farmPlot.latitude,
          longitude: selectedSeason.farmPlot.longitude,
        }
      : null;
  const activeLocation = plotLocation ?? location;

  const marketQueryString = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedSeason?.cropName) {
      params.set('cropName', selectedSeason.cropName);
    }
    if (activeLocation) {
      params.set('latitude', String(activeLocation.latitude));
      params.set('longitude', String(activeLocation.longitude));
      params.set('includeDistance', 'true');
    }
    return params.toString();
  }, [activeLocation, selectedSeason?.cropName]);

  const marketsQuery = useCachedQuery({
    cacheKey: `markets:${selectedSeason?.cropName ?? 'default'}`,
    queryKey: ['markets', token, marketQueryString],
    enabled: Boolean(token && selectedSeason?.cropName),
    queryFn: () => apiGet<MarketsResponse>(`/markets?${marketQueryString}`, token),
  });

  const facilitiesQuery = useCachedQuery({
    cacheKey: `facilities-preview:${selectedSeason?.cropName ?? 'default'}`,
    queryKey: ['facilities-preview', token, selectedSeason?.cropName, activeLocation],
    enabled: Boolean(token && activeLocation),
    queryFn: () =>
      apiGet<FacilitiesResponse>(
        `/facilities/nearby?latitude=${activeLocation?.latitude}&longitude=${activeLocation?.longitude}${
          selectedSeason?.cropName
            ? `&cropName=${encodeURIComponent(selectedSeason.cropName)}`
            : ''
        }`,
        token,
      ),
  });

  const recommendedRecord = marketsQuery.data?.recommendedRecord ?? null;
  const cropName = selectedSeason?.cropName ?? recommendedRecord?.cropName ?? 'Wheat';
  const districtLabel =
    selectedSeason?.farmPlot.district ?? profile?.user.district ?? profile?.user.state ?? 'Nashik';

  const pinnedCrops = useMemo(() => {
    const primaryPrice = recommendedRecord?.priceModal ?? 2450;

    return [
      {
        id: 'primary-crop',
        title:
          cropName.toLowerCase() === 'wheat' ? 'Wheat (Sonalika)' : `${cropName} (Primary)`,
        price: primaryPrice,
        changeLabel: '+1.2%',
        trendLabel: 'Trending Up',
        trend: 'up' as const,
        icon: 'wheat' as const,
      },
      {
        id: 'basmati-rice',
        title: 'Basmati Rice',
        price: 4820,
        changeLabel: '-0.8%',
        trendLabel: 'Minor Dip',
        trend: 'down' as const,
        icon: 'sprout' as const,
      },
      {
        id: 'tur-dal',
        title: 'Tur Dal',
        price: 5930,
        changeLabel: '+2.5%',
        trendLabel: 'Steady Demand',
        trend: 'up' as const,
        icon: 'field' as const,
      },
    ];
  }, [cropName, recommendedRecord?.priceModal]);

  const nearbyCards = useMemo(() => {
    const fallback = [
      {
        id: 'fallback-market-1',
        title: 'Krishi Mandi Nashik',
        distanceKm: 4.2,
        statusLabel: 'Open now',
        statusTone: 'open' as const,
        price: 2440,
        image: 'market' as const,
        iconTone: 'active' as const,
        detailsRoute: '/sell-store' as const,
      },
      {
        id: 'fallback-market-2',
        title: 'Krishi Mandi Nashik',
        distanceKm: 4.2,
        statusLabel: 'Open now',
        statusTone: 'open' as const,
        price: 2440,
        image: 'market' as const,
        iconTone: 'active' as const,
        detailsRoute: '/sell-store' as const,
      },
      {
        id: 'fallback-warehouse-1',
        title: 'Royal Agro Warehouse',
        distanceKm: 6.8,
        statusLabel: 'Closes at 6 PM',
        statusTone: 'closing' as const,
        price: 2465,
        image: 'warehouse' as const,
        iconTone: 'muted' as const,
        detailsRoute: '/facilities' as const,
      },
      {
        id: 'fallback-warehouse-2',
        title: 'Royal Agro Warehouse',
        distanceKm: 6.8,
        statusLabel: 'Closes at 6 PM',
        statusTone: 'closing' as const,
        price: 2465,
        image: 'warehouse' as const,
        iconTone: 'muted' as const,
        detailsRoute: '/facilities' as const,
      },
      {
        id: 'fallback-warehouse-3',
        title: 'Royal Agro Warehouse',
        distanceKm: 6.8,
        statusLabel: 'Closes at 6 PM',
        statusTone: 'closing' as const,
        price: 2465,
        image: 'warehouse' as const,
        iconTone: 'muted' as const,
        detailsRoute: '/facilities' as const,
      },
      {
        id: 'fallback-apmc',
        title: 'Pimpalgaon APMC',
        distanceKm: 12.5,
        statusLabel: 'Verified',
        statusTone: 'verified' as const,
        price: 2430,
        image: 'apmc' as const,
        iconTone: 'muted' as const,
        detailsRoute: '/facilities' as const,
      },
    ];

    const liveMarkets =
      marketsQuery.data?.topNearby?.slice(0, 2).map((record, index) => ({
        ...fallback[index],
        id: record.id,
        title: record.mandiName,
        distanceKm: record.distanceKm ?? fallback[index].distanceKm,
        price: record.priceModal,
      })) ?? [];

    const liveFacilities =
      facilitiesQuery.data?.facilities?.slice(0, 4).map((facility, index) => {
        const fallbackIndex = index + 2;
        const price = facility.marketContext?.priceModal ?? fallback[fallbackIndex].price;

        return {
          ...fallback[fallbackIndex],
          id: facility.id,
          title: facility.name,
          distanceKm: facility.distanceKm,
          statusLabel:
            facility.type === 'WAREHOUSE'
              ? 'Closes at 6 PM'
              : fallbackIndex === 5
                ? 'Verified'
                : 'Open now',
          statusTone:
            facility.type === 'WAREHOUSE'
              ? ('closing' as const)
              : fallbackIndex === 5
                ? ('verified' as const)
                : ('open' as const),
          image:
            facility.type === 'WAREHOUSE'
              ? ('warehouse' as const)
              : fallbackIndex === 5
                ? ('apmc' as const)
                : ('market' as const),
          iconTone: facility.type === 'WAREHOUSE' ? ('muted' as const) : ('active' as const),
          price,
          detailsRoute: facility.type === 'WAREHOUSE' ? ('/facilities' as const) : ('/sell-store' as const),
        };
      }) ?? [];

    return fallback.map((card, index) => {
      if (index < 2) {
        return liveMarkets[index] ?? card;
      }

      return liveFacilities[index - 2] ?? card;
    });
  }, [facilitiesQuery.data?.facilities, marketsQuery.data?.topNearby]);

  return (
    <MandiMarketScreen
      cropName={cropName}
      filterMode={filterMode}
      insightBody={
        tradeMode === 'buy'
          ? `Recommendation: Hold current stock for 5-7 days for better margins in ${districtLabel}.`
          : `Recommendation: Monitor nearby verified stores and time the release window over the next 5-7 days.`
      }
      insightHeadline={`${cropName} prices in ${districtLabel} expected to rise by 8% next week.`}
      nearbyCards={nearbyCards}
      onBackPress={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }

        router.push('/home');
      }}
      onBellPress={() => router.push('/alerts')}
      onDetailsPress={(card) => router.push(card.detailsRoute)}
      onFilterModeChange={setFilterMode}
      onOpenAi={() => router.push('/voice')}
      onOpenChat={() => router.push('/voice')}
      onOpenExpenses={() => router.push('/expenses')}
      onOpenHome={() => router.push('/home')}
      onSearchTextChange={setSearchText}
      onTradeModeChange={setTradeMode}
      onViewAllPinned={() => router.push('/crop-plan')}
      pinnedCrops={pinnedCrops}
      searchText={searchText}
      tradeMode={tradeMode}
    />
  );
}
