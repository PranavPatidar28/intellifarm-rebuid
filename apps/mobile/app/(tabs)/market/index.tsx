import { useMemo, useState } from 'react';

import { useRouter } from 'expo-router';

import {
  MandiMarketScreen,
  type MarketCropListItem,
  type MarketMandiListItem,
} from '@/components/mandi-market-screen';
import { storageKeys } from '@/lib/constants';
import { findSeasonContext } from '@/lib/domain';
import { type MarketExplorerView, type MarketPinnedCrop } from '@/lib/market-explorer';
import {
  getMockCropSummaries,
  getMockMandiSummaries,
  getMockPinnedCropItems,
  mockCropOptions,
  type MarketTradeMode,
} from '@/lib/mock-market-data';
import { useStoredValue } from '@/lib/storage';
import { useSession } from '@/features/session/session-provider';

export default function MarketRoute() {
  const router = useRouter();
  const { profile } = useSession();
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

  const cropItems = useMemo<MarketCropListItem[]>(() => {
    return getMockCropSummaries(tradeMode)
      .map((item) => ({
        ...item,
        pinned: pinnedKeySet.has(item.cropKey),
      }))
      .filter((item) =>
        trimmedSearchText ? item.cropName.toLowerCase().includes(trimmedSearchText) : true,
      );
  }, [pinnedKeySet, tradeMode, trimmedSearchText]);

  const mandiItems = useMemo<MarketMandiListItem[]>(() => {
    return getMockMandiSummaries(tradeMode).filter((item) => {
      if (!trimmedSearchText) {
        return true;
      }

      const searchTarget = `${item.mandiName} ${item.district} ${item.state}`.toLowerCase();
      return searchTarget.includes(trimmedSearchText);
    });
  }, [tradeMode, trimmedSearchText]);

  const pinnedItems = useMemo<MarketCropListItem[]>(() => {
    return getMockPinnedCropItems(pinnedCrops, tradeMode)
      .map((item) => ({
        ...item,
        pinned: true,
      }))
      .filter((item) =>
        trimmedSearchText ? item.cropName.toLowerCase().includes(trimmedSearchText) : true,
      );
  }, [pinnedCrops, tradeMode, trimmedSearchText]);

  const addCropOptions = useMemo(() => {
    return mockCropOptions.filter((item) => !pinnedKeySet.has(item.value));
  }, [pinnedKeySet]);

  const emptyState = useMemo(() => {
    if (view === 'pinned') {
      return {
        title: 'No pinned crops yet',
        description: 'Pin crops from All Crops or add one to your watchlist.',
        actionLabel: 'Browse crops',
        onAction: () => setView('crops'),
      };
    }

    if (view === 'mandis') {
      return {
        title: 'No mandis found',
        description: 'Try a different mandi name or clear the search.',
      };
    }

    return {
      title: 'No crops found',
      description: 'Try a different crop name or clear the search.',
    };
  }, [view]);

  return (
    <MandiMarketScreen
      addCropOptions={addCropOptions}
      cropItems={cropItems}
      emptyState={emptyState}
      mandiItems={mandiItems}
      onAddPinnedCrop={(cropKey) => {
        const cropLabel = mockCropOptions.find((item) => item.value === cropKey)?.label;

        if (!cropLabel || pinnedKeySet.has(cropKey)) {
          return;
        }

        setPinnedCrops([...pinnedCrops, { cropKey, cropName: cropLabel }]);
      }}
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
          {
            cropKey: item.cropKey,
            cropName: item.cropName,
          },
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
