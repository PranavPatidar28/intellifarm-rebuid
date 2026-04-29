import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Stack, useRouter } from 'expo-router';
import { CloudSun, MapPin, Sprout } from 'lucide-react-native';

import { Button } from '@/components/button';
import { CompactListCard } from '@/components/compact-list-card';
import { EmptyState } from '@/components/empty-state';
import { MetricBadge } from '@/components/metric-badge';
import { OptionChipGroup } from '@/components/option-chip-group';
import { PageShell } from '@/components/page-shell';
import { SectionTitle } from '@/components/section-title';
import { SunriseCard } from '@/components/sunrise-card';
import { TextField } from '@/components/text-field';
import { useSession } from '@/features/session/session-provider';
import { apiPost, ApiError } from '@/lib/api';
import type { CropSuggestionResponse } from '@/lib/api-types';
import { seasonKeyOptions, storageKeys } from '@/lib/constants';
import { findSeasonContext, getSuggestedSeasonKey } from '@/lib/domain';
import { useStoredValue } from '@/lib/storage';
import { palette, spacing, typography } from '@/theme/tokens';

type SeasonKeyValue = (typeof seasonKeyOptions)[number]['value'];

export default function CropPredictionRoute() {
  const router = useRouter();
  const { profile, token } = useSession();
  const [selectedSeasonId] = useStoredValue(storageKeys.selectedSeasonId, '');
  const activeSeason = useMemo(
    () => findSeasonContext(profile, selectedSeasonId),
    [profile, selectedSeasonId],
  );
  const farms = profile?.farms ?? [];

  const defaultFarmPlotId = activeSeason?.farmPlot.id ?? farms[0]?.id ?? '';
  const defaultSeasonKey = activeSeason
    ? getSuggestedSeasonKey(new Date(activeSeason.sowingDate).getMonth())
    : getSuggestedSeasonKey(new Date().getMonth());
  const defaultSowingDate =
    activeSeason?.sowingDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

  const [farmPlotId, setFarmPlotId] = useState(defaultFarmPlotId);
  const [seasonKey, setSeasonKey] = useState<SeasonKeyValue>(defaultSeasonKey);
  const [sowingDate, setSowingDate] = useState(defaultSowingDate);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<CropSuggestionResponse | null>(null);

  useEffect(() => {
    if (!farmPlotId && defaultFarmPlotId) {
      setFarmPlotId(defaultFarmPlotId);
    }
  }, [defaultFarmPlotId, farmPlotId]);

  useEffect(() => {
    if (!suggestions) {
      setSeasonKey((current) => current || defaultSeasonKey);
      setSowingDate((current) => current || defaultSowingDate);
    }
  }, [defaultSeasonKey, defaultSowingDate, suggestions]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === farmPlotId) ?? null,
    [farmPlotId, farms],
  );

  if (!farms.length) {
    return (
      <>
        <Stack.Screen options={{ title: 'Crop prediction' }} />
        <PageShell
          eyebrow="Prediction tool"
          title="Crop prediction"
          subtitle="Add at least one farm plot so IntelliFarm can score crops against a real place."
        >
          <EmptyState
            title="No farm plot available"
            description="Create a plot first, then come back here for a lightweight crop-fit check."
          />
          <Button label="Back to plot setup" onPress={() => router.replace('/plot')} />
        </PageShell>
      </>
    );
  }

  const runPrediction = async () => {
    if (!token || !farmPlotId) {
      setMessage('Choose a farm plot before checking crop fit.');
      return;
    }

    const parsedDate = new Date(`${sowingDate}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
      setMessage('Use YYYY-MM-DD for the sowing date.');
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const response = await apiPost<CropSuggestionResponse>(
        '/predictions/crop-suggestions',
        {
          farmPlotId,
          seasonProfile: {
            seasonKey,
            sowingMonth: parsedDate.getMonth() + 1,
          },
        },
        token,
      );

      setSuggestions(response);
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : 'Could not load crop suggestions right now.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Crop prediction' }} />
      <PageShell
        eyebrow="Prediction tool"
        title="Crop prediction"
        subtitle="Run a lightweight crop-fit check before you commit to a new season."
        heroTone="scheme"
        hero={
          <SunriseCard accent="soft" title="Quick planning assist">
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 13,
                lineHeight: 19,
              }}
            >
              Use your current plot, season window, and sowing timing to surface the most likely crop matches. You can still continue into full season setup afterward.
            </Text>
          </SunriseCard>
        }
      >
        <OptionChipGroup
          title="Farm plot"
          value={farmPlotId}
          options={farms.map((farm) => ({ value: farm.id, label: farm.name }))}
          onChange={(value) => setFarmPlotId(value)}
        />

        <OptionChipGroup
          title="Season window"
          value={seasonKey}
          options={seasonKeyOptions.map((item) => ({
            value: item.value,
            label: item.label,
          }))}
          onChange={(value) => {
            setSeasonKey(value as SeasonKeyValue);
          }}
        />

        <TextField
          label="Expected sowing date"
          value={sowingDate}
          onChangeText={setSowingDate}
          helper="Use YYYY-MM-DD so IntelliFarm can infer the sowing month correctly."
        />

        {selectedFarm ? (
          <SunriseCard accent="info" title="Selected field context">
            <View style={{ gap: spacing.sm }}>
              <ContextLine
                icon={<MapPin color={palette.sky} size={16} />}
                label={`${selectedFarm.village}, ${selectedFarm.district}`}
              />
              <ContextLine
                icon={<Sprout color={palette.leafDark} size={16} />}
                label={`${selectedFarm.area} acre plot with ${selectedFarm.irrigationType.toLowerCase().replace(/_/g, ' ')} irrigation`}
              />
              <ContextLine
                icon={<CloudSun color={palette.mustard} size={16} />}
                label={
                  activeSeason
                    ? `Prefilled from ${activeSeason.cropName}`
                    : 'Using your saved farm profile'
                }
              />
            </View>
          </SunriseCard>
        ) : null}

        {message ? (
          <SunriseCard accent="warning" title="Prediction note">
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 13,
                lineHeight: 19,
              }}
            >
              {message}
            </Text>
          </SunriseCard>
        ) : null}

        <Button
          label={busy ? 'Checking crop fit...' : 'Run crop prediction'}
          loading={busy}
          onPress={() => {
            void runPrediction();
          }}
        />

        {suggestions ? (
          <View style={{ gap: spacing.md }}>
            <SectionTitle
              eyebrow="Prediction result"
              title="Best-fit crops"
              action={
                <MetricBadge
                  label={`Confidence ${formatConfidenceLabel(suggestions.inputConfidence)}`}
                  tone={confidenceToneMap[suggestions.inputConfidence]}
                />
              }
            />

            <SunriseCard accent="info" title="Why this looks promising">
              <View style={{ gap: spacing.sm }}>
                <Text style={bodyText}>
                  {suggestions.seasonClimate.label} with soil context from{' '}
                  {suggestions.soilProfile.summary.toLowerCase()}.
                </Text>
                <Text style={bodyText}>
                  Current weather: {Math.round(suggestions.weather.currentTemperatureC)} C,
                  humidity {Math.round(suggestions.weather.humidityPercent)}%, and about{' '}
                  {Math.round(suggestions.weather.rainfallExpectedMm)} mm rain expected.
                </Text>
              </View>
            </SunriseCard>

            <View style={{ gap: spacing.sm }}>
              {suggestions.suggestions.slice(0, 3).map((item) => (
                <CompactListCard
                  key={item.cropName}
                  title={item.cropName}
                  subtitle={item.rationale}
                  prefix={
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: palette.leafMist,
                      }}
                    >
                      <Sprout color={palette.leafDark} size={18} />
                    </View>
                  }
                  trailing={
                    <MetricBadge
                      label={`${Math.round(item.score * 100)}% fit`}
                      tone="success"
                    />
                  }
                />
              ))}
            </View>

            {suggestions.assumptions.length ? (
              <SunriseCard accent="soft" title="Assumptions used">
                <View style={{ gap: spacing.xs }}>
                  {suggestions.assumptions.slice(0, 3).map((item) => (
                    <Text key={item} style={bulletText}>
                      - {item}
                    </Text>
                  ))}
                </View>
              </SunriseCard>
            ) : null}

            <View style={{ gap: spacing.sm }}>
              <Button
                label="Continue to season setup"
                onPress={() =>
                  router.push({
                    pathname: '/season',
                    params: { farmPlotId },
                  })
                }
              />
              <Button
                label="Back to Home"
                variant="ghost"
                onPress={() => router.back()}
              />
            </View>
          </View>
        ) : null}
      </PageShell>
    </>
  );
}

function ContextLine({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      {icon}
      <Text style={bodyText}>{label}</Text>
    </View>
  );
}

function formatConfidenceLabel(value: CropSuggestionResponse['inputConfidence']) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

const confidenceToneMap: Record<
  CropSuggestionResponse['inputConfidence'],
  'success' | 'warning' | 'danger'
> = {
  HIGH: 'success',
  MEDIUM: 'warning',
  LOW: 'danger',
};

const bodyText = {
  color: palette.inkSoft,
  fontFamily: typography.bodyRegular,
  fontSize: 13,
  lineHeight: 19,
};

const bulletText = {
  color: palette.inkSoft,
  fontFamily: typography.bodyRegular,
  fontSize: 12,
  lineHeight: 18,
};
