import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Stack, useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { FacilityCard } from '@/components/facility-card';
import { PageShell } from '@/components/page-shell';
import { RichEmptyState } from '@/components/rich-empty-state';
import { SegmentedChipRow } from '@/components/segmented-chip-row';
import { SunriseCard } from '@/components/sunrise-card';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { apiGet } from '@/lib/api';
import type { FacilitiesResponse } from '@/lib/api-types';
import { findSeasonContext } from '@/lib/domain';
import { openExternalMap } from '@/lib/maps';
import { storageKeys } from '@/lib/constants';
import { useStoredValue } from '@/lib/storage';
import { palette, spacing, typography } from '@/theme/tokens';

type FacilityFilter = 'ALL' | 'MANDI' | 'WAREHOUSE';

export default function FacilitiesRoute() {
  const router = useRouter();
  const { profile, token } = useSession();
  const { location, refreshLocation, status: locationStatus } = useDeviceLocation();
  const [selectedSeasonId] = useStoredValue(storageKeys.selectedSeasonId, '');
  const [filter, setFilter] = useState<FacilityFilter>('ALL');

  const selectedSeason = findSeasonContext(profile, selectedSeasonId);
  const plotLocation =
    selectedSeason?.farmPlot.latitude != null && selectedSeason?.farmPlot.longitude != null
      ? {
          latitude: selectedSeason.farmPlot.latitude,
          longitude: selectedSeason.farmPlot.longitude,
        }
      : null;
  const activeLocation = plotLocation ?? location;

  const queryString = useMemo(() => {
    if (!activeLocation) {
      return '';
    }

    const params = new URLSearchParams({
      latitude: String(activeLocation.latitude),
      longitude: String(activeLocation.longitude),
      radiusKm: '120',
    });

    if (selectedSeason?.cropName) {
      params.set('cropName', selectedSeason.cropName);
    }

    if (filter !== 'ALL') {
      params.set('types', filter);
    }

    return params.toString();
  }, [activeLocation, filter, selectedSeason?.cropName]);

  const facilitiesQuery = useCachedQuery({
    cacheKey: `facilities:${filter}:${selectedSeason?.cropName ?? 'default'}`,
    queryKey: ['facilities', token, queryString],
    enabled: Boolean(token && queryString),
    queryFn: () => apiGet<FacilitiesResponse>(`/facilities/nearby?${queryString}`, token),
  });

  const facilities = facilitiesQuery.data?.facilities ?? [];

  return (
    <>
      <Stack.Screen options={{ title: 'Nearby facilities' }} />
      <PageShell
        eyebrow="Nearby markets and warehouses"
        title="Nearby support points"
        subtitle="Find mandis, storage, and practical travel options around the active farm."
      >
        {!activeLocation ? (
          <SunriseCard accent="info" title="Location is needed first">
            <View style={{ gap: spacing.sm }}>
              <Text
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 14,
                  lineHeight: 21,
                }}
              >
                Your current plot does not yet have GPS coordinates, so use the phone location once to sort facilities by distance.
              </Text>
              <Button
                label={locationStatus === 'loading' ? 'Reading location...' : 'Use current location'}
                variant="soft"
                onPress={() => {
                  void refreshLocation();
                }}
              />
            </View>
          </SunriseCard>
        ) : null}

        <SegmentedChipRow
          value={filter}
          options={[
            { value: 'ALL', label: 'All' },
            { value: 'MANDI', label: 'Mandis' },
            { value: 'WAREHOUSE', label: 'Warehouses' },
          ]}
          onChange={setFilter}
        />

        <View style={{ gap: spacing.md }}>
          {facilities.length ? (
            facilities.map((facility) => (
              <View key={facility.id} style={{ gap: spacing.sm }}>
                <FacilityCard facility={facility} />
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Button
                    label="Navigate"
                    fullWidth={false}
                    onPress={() => {
                      void openExternalMap({
                        latitude: facility.latitude,
                        longitude: facility.longitude,
                        label: facility.name,
                      });
                    }}
                  />
                  <Button
                    label="Back to market"
                    fullWidth={false}
                    variant="soft"
                    onPress={() => router.push('/market')}
                  />
                </View>
              </View>
            ))
          ) : (
            <RichEmptyState
              title="No nearby facilities found"
              description="Try enabling the location or widening the crop context to show mandis and warehouses."
            />
          )}
        </View>
      </PageShell>
    </>
  );
}
