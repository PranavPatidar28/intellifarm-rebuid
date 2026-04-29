import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Stack, useRouter } from 'expo-router';

import { PageShell } from '@/components/page-shell';
import { RichEmptyState } from '@/components/rich-empty-state';
import { SchemeCard } from '@/components/scheme-card';
import { SegmentedChipRow } from '@/components/segmented-chip-row';
import { SunriseCard } from '@/components/sunrise-card';
import { TextField } from '@/components/text-field';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { apiGet } from '@/lib/api';
import type { SchemesResponse } from '@/lib/api-types';
import { findSeasonContext } from '@/lib/domain';
import { storageKeys } from '@/lib/constants';
import { useStoredValue } from '@/lib/storage';
import { palette, spacing, typography } from '@/theme/tokens';

export default function SchemesRoute() {
  const router = useRouter();
  const { profile, token } = useSession();
  const [selectedSeasonId] = useStoredValue(storageKeys.selectedSeasonId, '');
  const [cropName, setCropName] = useState(
    findSeasonContext(profile, selectedSeasonId)?.cropName ?? '',
  );
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (cropName) params.set('cropName', cropName);
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    return params.toString();
  }, [category, cropName, search]);

  const schemesQuery = useCachedQuery({
    cacheKey: `schemes:${queryString || 'default'}`,
    queryKey: ['schemes', token, queryString],
    enabled: Boolean(token),
    queryFn: () => apiGet<SchemesResponse>(`/schemes${queryString ? `?${queryString}` : ''}`, token),
  });

  const schemes = schemesQuery.data?.schemes ?? [];
  const recommendedSchemeId = schemesQuery.data?.recommendedSchemeId;

  return (
    <>
      <Stack.Screen options={{ title: 'Government schemes' }} />
      <PageShell
        eyebrow="Support"
        title="Government schemes"
        subtitle="Farmer-friendly scheme discovery with simpler relevance and faster next steps."
        heroTone="scheme"
      >
        <SunriseCard accent="scheme" title="Filter simply">
          <View style={{ gap: spacing.md }}>
            <TextField label="Crop" value={cropName} onChangeText={setCropName} />
            <TextField label="Search" value={search} onChangeText={setSearch} />
            <SegmentedChipRow
              value={category || 'All'}
              options={[
                { value: 'All', label: 'All' },
                { value: 'Insurance', label: 'Insurance' },
                { value: 'Credit', label: 'Credit' },
                { value: 'Irrigation', label: 'Irrigation' },
              ]}
              onChange={(value) => setCategory(value === 'All' ? '' : value)}
            />
          </View>
        </SunriseCard>

        {recommendedSchemeId ? (
          <SunriseCard accent="soft" title="Recommended for your current context">
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 14,
                lineHeight: 21,
              }}
            >
              IntelliFarm highlighted one scheme based on your crop and location. Open the first highlighted card below to start there.
            </Text>
          </SunriseCard>
        ) : null}

        <View style={{ gap: spacing.md }}>
          {schemes.length ? (
            schemes.map((scheme) => (
              <View key={scheme.id} style={{ gap: spacing.xs }}>
                {scheme.id === recommendedSchemeId ? (
                  <Text
                    style={{
                      color: palette.lilac,
                      fontFamily: typography.bodyStrong,
                      fontSize: 12,
                      textTransform: 'uppercase',
                    }}
                  >
                    Recommended
                  </Text>
                ) : null}
                <SchemeCard
                  scheme={scheme}
                  onDetails={() =>
                    router.push({
                      pathname: '/scheme/[id]',
                      params: { id: scheme.id },
                    })
                  }
                />
              </View>
            ))
          ) : (
            <RichEmptyState
              title="No matching schemes"
              description="Try a broader crop or clear the filters to see more official support options."
            />
          )}
        </View>
      </PageShell>
    </>
  );
}
