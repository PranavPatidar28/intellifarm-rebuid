import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { Stack, useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { DecisionCard } from '@/components/decision-card';
import { PageShell } from '@/components/page-shell';
import { RichEmptyState } from '@/components/rich-empty-state';
import { SunriseCard } from '@/components/sunrise-card';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { apiGet } from '@/lib/api';
import type { FacilitiesResponse, MarketsResponse } from '@/lib/api-types';
import { findSeasonContext } from '@/lib/domain';
import { formatCurrency, formatDistance } from '@/lib/format';
import { storageKeys } from '@/lib/constants';
import { useStoredValue } from '@/lib/storage';
import { gradients, palette, spacing, typography } from '@/theme/tokens';

export default function SellStoreRoute() {
  const router = useRouter();
  const { profile, token } = useSession();
  const [selectedSeasonId] = useStoredValue(storageKeys.selectedSeasonId, '');
  const selectedSeason = findSeasonContext(profile, selectedSeasonId);

  const activeLocation =
    selectedSeason?.farmPlot.latitude != null && selectedSeason?.farmPlot.longitude != null
      ? {
          latitude: selectedSeason.farmPlot.latitude,
          longitude: selectedSeason.farmPlot.longitude,
        }
      : null;

  const marketsQuery = useCachedQuery({
    cacheKey: `markets:${selectedSeason?.cropName ?? 'default'}`,
    queryKey: ['markets', token, selectedSeason?.cropName, activeLocation],
    enabled: Boolean(token && selectedSeason?.cropName && activeLocation),
    queryFn: () =>
      apiGet<MarketsResponse>(
        `/markets?cropName=${encodeURIComponent(selectedSeason?.cropName ?? '')}&latitude=${activeLocation?.latitude}&longitude=${activeLocation?.longitude}&includeDistance=true`,
        token,
      ),
  });

  const facilitiesQuery = useCachedQuery({
    cacheKey: `warehouses:${selectedSeason?.cropName ?? 'default'}`,
    queryKey: ['warehouses', token, selectedSeason?.cropName, activeLocation],
    enabled: Boolean(token && activeLocation),
    queryFn: () =>
      apiGet<FacilitiesResponse>(
        `/facilities/nearby?latitude=${activeLocation?.latitude}&longitude=${activeLocation?.longitude}&types=WAREHOUSE${
          selectedSeason?.cropName
            ? `&cropName=${encodeURIComponent(selectedSeason.cropName)}`
            : ''
        }`,
        token,
      ),
  });

  const bestRecord = marketsQuery.data?.bestRecord ?? null;
  const nearestWarehouse = facilitiesQuery.data?.facilities[0] ?? null;

  const suggestion = useMemo(() => {
    if (!bestRecord) {
      return 'No reliable price signal is loaded yet. Check the market again before deciding whether to sell or wait.';
    }

    if (!nearestWarehouse) {
      return 'A mandi price is visible, but no nearby warehouse is loaded. If you need immediate cash, compare the nearest mandi first.';
    }

    if ((bestRecord.distanceKm ?? 999) <= 20 && nearestWarehouse.distanceKm > 25) {
      return 'The best visible mandi price is relatively close. If cash flow matters today, selling nearby may be simpler than transporting to storage.';
    }

    return 'Price looks usable but not guaranteed to rise. If you have safe storage and can wait, compare nearby warehouse access before rushing to sell.';
  }, [bestRecord, nearestWarehouse]);

  if (!selectedSeason) {
    return (
      <PageShell
        eyebrow="Sell or store"
        title="Decision support"
        subtitle="Set up a crop season first to compare price and storage context."
      >
        <RichEmptyState
          title="No crop context yet"
          description="This suggestion needs a current crop and a farm location."
        />
      </PageShell>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Sell or store' }} />
      <PageShell
        eyebrow="Price decision"
        title="Sell or store suggestion"
        subtitle="Use cautious wording, not price promises."
      >
        <DecisionCard
          eyebrow="Current suggestion"
          title={bestRecord ? `${bestRecord.mandiName} at ${formatCurrency(bestRecord.priceModal)}` : 'Waiting for market signal'}
          body={suggestion}
          colors={gradients.marketGold}
        />

        <SunriseCard accent="soft" title="Current view">
          <View style={{ gap: spacing.sm }}>
            <Metric label="Current mandi price" value={bestRecord ? formatCurrency(bestRecord.priceModal) : '--'} />
            <Metric label="Nearest warehouse" value={nearestWarehouse ? nearestWarehouse.name : 'Not loaded'} />
            <Metric
              label="Warehouse distance"
              value={nearestWarehouse ? formatDistance(nearestWarehouse.distanceKm) : 'Unavailable'}
            />
          </View>
        </SunriseCard>

        <SunriseCard accent="info" title="Storage checklist">
          <View style={{ gap: spacing.sm }}>
            <Text style={bulletStyle}>1. Check if storage is dry, safe, and close enough to justify transport.</Text>
            <Text style={bulletStyle}>2. Compare transport effort against the price difference you actually see today.</Text>
            <Text style={bulletStyle}>3. Avoid assuming that prices will definitely rise next week.</Text>
          </View>
        </SunriseCard>

        <View style={{ gap: spacing.sm }}>
          <Button label="Find warehouse" onPress={() => router.push('/facilities')} />
          <Button label="Check market again" variant="soft" onPress={() => router.push('/market')} />
        </View>
      </PageShell>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text
        style={{
          color: palette.inkSoft,
          fontFamily: typography.bodyStrong,
          fontSize: 12,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: palette.ink,
          fontFamily: typography.bodyStrong,
          fontSize: 15,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const bulletStyle = {
  color: palette.inkSoft,
  fontFamily: typography.bodyRegular,
  fontSize: 14,
  lineHeight: 21,
};
