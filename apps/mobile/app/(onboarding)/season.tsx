import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { PageShell } from '@/components/page-shell';
import { SunriseCard } from '@/components/sunrise-card';
import { TextField } from '@/components/text-field';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import type {
  CropDefinitionsResponse,
  CropSeasonResponse,
  CropSuggestionResponse,
  FarmPlotsResponse,
} from '@/lib/api-types';
import { getSuggestedSeasonKey } from '@/lib/domain';
import { seasonKeyOptions, storageKeys } from '@/lib/constants';
import { storage } from '@/lib/storage';
import { palette, spacing, typography } from '@/theme/tokens';

export default function SeasonSetupRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ farmPlotId?: string }>();
  const { token, refreshSession } = useSession();
  const [cropDefinitionId, setCropDefinitionId] = useState('');
  const [cropName, setCropName] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'PLANNED'>('ACTIVE');
  const [sowingDate, setSowingDate] = useState(new Date().toISOString().slice(0, 10));
  const [seasonKey, setSeasonKey] = useState(
    getSuggestedSeasonKey(new Date().getMonth()),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<CropSuggestionResponse | null>(null);
  const [predictionBusy, setPredictionBusy] = useState(false);

  const farmsQuery = useCachedQuery({
    cacheKey: 'farm-plots',
    queryKey: ['farm-plots', token],
    enabled: Boolean(token),
    queryFn: () => apiGet<FarmPlotsResponse>('/farm-plots', token),
  });

  const cropsQuery = useCachedQuery({
    cacheKey: 'crop-definitions',
    queryKey: ['crop-definitions', token],
    enabled: Boolean(token),
    queryFn: () => apiGet<CropDefinitionsResponse>('/crop-definitions', token),
  });

  const farms = farmsQuery.data?.farmPlots ?? [];
  const crops = cropsQuery.data?.cropDefinitions ?? [];
  const farmPlotId = (params.farmPlotId as string | undefined) ?? farms[0]?.id ?? '';

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === farmPlotId) ?? null,
    [farmPlotId, farms],
  );

  if (!farms.length && !farmsQuery.isLoading) {
    return (
      <PageShell
        eyebrow="Step 3 of 3"
        title="Set up your current crop"
        subtitle="A plot is needed before the crop season can begin."
      >
        <EmptyState
          title="No plot yet"
          description="Create a farm plot first so IntelliFarm can attach the crop season to a real place."
        />
        <Button label="Back to plot setup" onPress={() => router.replace('/plot')} />
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Step 3 of 3"
      title="Set up your current crop"
      subtitle="Choose the crop and sowing window, then let IntelliFarm generate the first field plan."
      hero={
        <SunriseCard accent="scheme" title="Fast crop-fit preview">
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 14,
              lineHeight: 21,
            }}
          >
            If you want a quick planning check before finalizing the season, use crop suggestions below. It stays tied to the existing prediction API.
          </Text>
        </SunriseCard>
      }
    >
      <OptionSelector
        title="Farm plot"
        value={farmPlotId}
        options={farms.map((farm) => ({ value: farm.id, label: farm.name }))}
        onChange={(value) => {
          router.setParams({ farmPlotId: value });
        }}
      />
      <OptionSelector
        title="Season window"
        value={seasonKey}
        options={seasonKeyOptions.map((item) => ({
          value: item.value,
          label: item.label,
        }))}
        onChange={(value) => setSeasonKey(value as typeof seasonKey)}
      />
      <OptionSelector
        title="Crop"
        value={cropDefinitionId}
        options={crops.map((crop) => ({ value: crop.id, label: crop.nameEn }))}
        onChange={(value) => {
          setCropDefinitionId(value);
          const selected = crops.find((item) => item.id === value);
          setCropName(selected?.nameEn ?? '');
        }}
      />
      <TextField
        label="Sowing date"
        value={sowingDate}
        onChangeText={setSowingDate}
        helper="Use YYYY-MM-DD, for example 2026-06-15."
      />
      <OptionSelector
        title="Season status"
        value={status}
        options={[
          { value: 'ACTIVE', label: 'Active now' },
          { value: 'PLANNED', label: 'Planned' },
        ]}
        onChange={(value) => setStatus(value as typeof status)}
      />

      <Button
        label={predictionBusy ? 'Checking crop fit...' : 'Preview crop fit'}
        variant="soft"
        loading={predictionBusy}
        onPress={() => {
          if (!token || !selectedFarm) {
            return;
          }

          setPredictionBusy(true);
          setMessage(null);

          void apiPost<CropSuggestionResponse>(
            '/predictions/crop-suggestions',
            {
              farmPlotId: selectedFarm.id,
              seasonProfile: {
                seasonKey,
                sowingMonth: new Date(sowingDate).getMonth() + 1,
              },
            },
            token,
          )
            .then((response) => {
              setSuggestions(response);
            })
            .catch((error) => {
              setMessage(
                error instanceof ApiError
                  ? error.message
                  : 'Could not load crop suggestions right now.',
              );
            })
            .finally(() => {
              setPredictionBusy(false);
            });
        }}
      />

      {suggestions ? (
        <SunriseCard accent="info" title="Planning assist">
          <View style={{ gap: spacing.sm }}>
            {suggestions.suggestions
              .slice(0, 3)
              .map((item: CropSuggestionResponse['suggestions'][number]) => (
              <Text
                key={item.cropName}
                style={{
                  color: palette.ink,
                  fontFamily: typography.bodyRegular,
                  fontSize: 14,
                  lineHeight: 21,
                }}
              >
                {item.cropName}: {Math.round(item.score * 100)}% fit · {item.rationale}
              </Text>
              ))}
          </View>
        </SunriseCard>
      ) : null}

      {message ? (
        <Text
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 13,
          }}
        >
          {message}
        </Text>
      ) : null}

      <Button
        label="Generate my crop plan"
        loading={busy}
        onPress={() => {
          if (!token || !farmPlotId || !cropDefinitionId || !cropName) {
            setMessage('Choose a plot and crop before continuing.');
            return;
          }

          setBusy(true);
          setMessage(null);

          void apiPost<CropSeasonResponse>(
            `/farm-plots/${farmPlotId}/crop-seasons`,
            {
              farmPlotId,
              cropDefinitionId,
              cropName,
              sowingDate,
              status,
            },
            token,
          )
            .then(async (response) => {
              storage.set(storageKeys.selectedSeasonId, response.cropSeason.id);
              await refreshSession();
              router.replace('/home');
            })
            .catch((error) => {
              setMessage(
                error instanceof ApiError
                  ? error.message
                  : 'Could not create the crop season right now.',
              );
            })
            .finally(() => {
              setBusy(false);
            });
        }}
      />
    </PageShell>
  );
}

function OptionSelector({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        style={{
          color: palette.ink,
          fontFamily: typography.bodyStrong,
          fontSize: 14,
        }}
      >
        {title}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {options.map((item) => (
          <Button
            key={item.value}
            label={item.label}
            fullWidth={false}
            variant={value === item.value ? 'primary' : 'soft'}
            onPress={() => onChange(item.value)}
          />
        ))}
      </View>
    </View>
  );
}
