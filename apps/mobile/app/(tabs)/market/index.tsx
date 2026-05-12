import { useMemo, useState } from 'react';

import { useRouter } from 'expo-router';

import {
  MandiMarketScreen,
  type MarketCropListItem,
  type MarketMandiListItem,
} from '@/components/mandi-market-screen';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { apiGet } from '@/lib/api';
import type {
  MarketExplorerCropsResponse,
  MarketExplorerMandisResponse,
} from '@/lib/api-types';
import { storageKeys } from '@/lib/constants';
import { findSeasonContext } from '@/lib/domain';
import {
  buildMarketExplorerQueryString,
  type MarketExplorerView,
  type MarketPinnedCrop,
} from '@/lib/market-explorer';
import type { MarketTradeMode } from '@/lib/mock-market-data';
import { useStoredValue } from '@/lib/storage';

export default function MarketRoute() {
  const router = useRouter();
  const { profile, token } = useSession();
  const { location } = useDeviceLocation();
  const [tradeMode, setTradeMode] = useState<MarketTradeMode>('sell');
  const [view, setView] = useState<MarketExplorerView>('crops');
  const [searchText, setSearchText] = useState('');
  const [selectedSeasonId] = useStoredValue(storageKeys.selectedSeasonId, '');
  const [pinnedCrops, setPinnedCrops] = useStoredValue<MarketPinnedCrop[]>(
    storageKeys.marketPinnedCrops,
    [],
  );
  const selectedSeason = findSeasonContext(profile, selectedSeasonId);

  const trimmedSearchText = searchText.trim().toLowerCase();
  const pinnedKeySet = useMemo(
    () => new Set(pinnedCrops.map((crop) => crop.cropKey)),
    [pinnedCrops],
  );

  // ── Resolve user location for API calls ─────────────────────────────

  const plotLocation =
    selectedSeason?.farmPlot.latitude != null &&
    selectedSeason?.farmPlot.longitude != null
      ? {
          latitude: selectedSeason.farmPlot.latitude,
          longitude: selectedSeason.farmPlot.longitude,
        }
      : null;
  const activeLocation = plotLocation ?? location;

  const explorerQueryString = useMemo(
    () =>
      buildMarketExplorerQueryString({
        scope: 'state',
        latitude: activeLocation?.latitude,
        longitude: activeLocation?.longitude,
        page: 1,
        pageSize: 50,
        search: trimmedSearchText || undefined,
      }),
    [activeLocation?.latitude, activeLocation?.longitude, trimmedSearchText],
  );

  // ── Fetch crops from the live API ───────────────────────────────────

  const cropsQuery = useCachedQuery({
    cacheKey: `market-explorer-crops:${explorerQueryString}`,
    queryKey: ['market-explorer-crops', token, explorerQueryString],
    enabled: Boolean(token),
    queryFn: () =>
      apiGet<MarketExplorerCropsResponse>(
        `/markets/explorer/crops?${explorerQueryString}`,
        token,
      ),
  });

  // ── Fetch mandis from the live API ──────────────────────────────────

  const mandisQuery = useCachedQuery({
    cacheKey: `market-explorer-mandis:${explorerQueryString}`,
    queryKey: ['market-explorer-mandis', token, explorerQueryString],
    enabled: Boolean(token),
    queryFn: () =>
      apiGet<MarketExplorerMandisResponse>(
        `/markets/explorer/mandis?${explorerQueryString}`,
        token,
      ),
  });

  // ── Map API responses to component data shapes ──────────────────────

  const cropItems = useMemo<MarketCropListItem[]>(() => {
    const apiCrops = cropsQuery.data?.crops ?? [];

    return apiCrops.map((crop: any) => ({
      cropKey: crop.cropKey,
      cropName: crop.cropName,
      latestPrice: crop.bestRecord?.priceModal ?? crop.latestRecord?.priceModal ?? null,
      trendLabel: crop.trendLabel ?? 'Rates steady',
      freshnessLabel: crop.freshnessLabel ?? 'No recent update',
      bestMandiName: crop.bestRecord?.mandiName ?? null,
      bestPrice: crop.bestRecord?.priceModal ?? null,
      nearestMandiName: crop.nearestRecord?.mandiName ?? null,
      nearestDistanceKm: crop.nearestRecord?.distanceKm ?? null,
      mandiCount: crop.mandiCount,
      hasLiveData: crop.latestRecord != null,
      pinned: pinnedKeySet.has(crop.cropKey),
    }));
  }, [cropsQuery.data, pinnedKeySet]);

  const mandiItems = useMemo<MarketMandiListItem[]>(() => {
    const apiMandis = mandisQuery.data?.mandis ?? [];

    return apiMandis.map((mandi: any) => ({
      mandiKey: mandi.mandiKey,
      mandiName: mandi.mandiName,
      district: mandi.district,
      state: mandi.state,
      distanceKm: mandi.distanceKm,
      cropCount: mandi.cropCount,
      topCropName: mandi.topRecord?.cropName ?? null,
      topPrice: mandi.topRecord?.priceModal ?? null,
      freshnessLabel: mandi.freshestRecord?.freshnessLabel ?? 'No recent update',
      hasLinkedFacility: mandi.hasLinkedFacility,
    }));
  }, [mandisQuery.data]);

  // Only show actually pinned items
  const pinnedItems = useMemo<MarketCropListItem[]>(() => {
    return cropItems
      .filter((item) => pinnedKeySet.has(item.cropKey))
      .map((item) => ({ ...item, pinned: true }));
  }, [cropItems, pinnedKeySet]);

  const isLoading = cropsQuery.isLoading || mandisQuery.isLoading;
  const isError = !isLoading && (cropsQuery.isError || mandisQuery.isError);

  return (
    <MandiMarketScreen
      cropItems={cropItems}
      isError={isError}
      isLoading={isLoading}
      mandiItems={mandiItems}
      onOpenAi={() =>
        router.push({
          pathname: '/voice',
          params: {
            prompt:
              tradeMode === 'sell'
                ? 'Compare whether I should sell now, store for later, or wait for a better mandi price.'
                : 'Help me compare the current market before I decide what to buy or arrange.',
            originRoute: 'market',
            focusCropSeasonId: selectedSeason?.id,
            focusFarmPlotId: selectedSeason?.farmPlot.id,
          },
        } as never)
      }
      onOpenCrop={(item) =>
        router.push({
          pathname: '/market/crop/[cropName]',
          params: { cropName: item.cropName, mode: tradeMode },
        })
      }
      onOpenMandi={(item) =>
        router.push({
          pathname: '/market/mandi/[mandiKey]',
          params: { mandiKey: item.mandiKey, mode: tradeMode },
        })
      }
      onSearchTextChange={setSearchText}
      onTogglePinnedCrop={(item) => {
        const exists = pinnedKeySet.has(item.cropKey);

        if (exists) {
          setPinnedCrops(pinnedCrops.filter((crop) => crop.cropKey !== item.cropKey));
          return;
        }

        setPinnedCrops([
          ...pinnedCrops,
          { cropKey: item.cropKey, cropName: item.cropName },
        ]);
      }}
      onTradeModeChange={setTradeMode}
      onViewChange={(nextView) => {
        setView(nextView);
        setSearchText('');
      }}
      pinnedItems={pinnedItems}
      searchText={searchText}
      tradeMode={tradeMode}
      view={view}
    />
  );
}
