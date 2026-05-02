import { useEffect, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { Stack, useRouter } from 'expo-router';
import { CalendarDays, ChevronDown, ChevronUp, History, MapPin, Sprout } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/button';
import { CompactListCard } from '@/components/compact-list-card';
import { MetricBadge } from '@/components/metric-badge';
import { OptionChipGroup } from '@/components/option-chip-group';
import { PageShell } from '@/components/page-shell';
import { SectionTitle } from '@/components/section-title';
import { SunriseCard } from '@/components/sunrise-card';
import { useSession } from '@/features/session/session-provider';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { ApiError, apiGet, apiPost } from '@/lib/api';
import type { CropSuggestionResponse } from '@/lib/api-types';
import { soilOptions, seasonKeyOptions, storageKeys } from '@/lib/constants';
import { findSeasonContext, getSuggestedSeasonKey } from '@/lib/domain';
import { useStoredValue } from '@/lib/storage';
import { palette, radii, spacing, typography } from '@/theme/tokens';

const CURRENT_LOCATION_SOURCE = 'CURRENT_LOCATION';

type SeasonKey = 'KHARIF' | 'RABI' | 'ZAID';
type PredictionRun = {
  id: string;
  type: string;
  provider: string;
  status: string;
  createdAt: string;
  outputJson?: {
    suggestions?: Array<{ cropName: string; score: number; rationale: string }>;
    inputConfidence?: 'HIGH' | 'MEDIUM' | 'LOW';
    seasonClimate?: { label?: string; locationLabel?: string };
  };
};

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SEASON_DEFAULT_MONTHS: Record<SeasonKey, number> = {
  KHARIF: 6,
  RABI: 11,
  ZAID: 3,
};

export default function CropPredictionRoute() {
  const router = useRouter();
  const { authUser, profile, token } = useSession();
  const [selectedSeasonId] = useStoredValue(storageKeys.selectedSeasonId, '');
  const activeSeason = useMemo(
    () => findSeasonContext(profile, selectedSeasonId),
    [profile, selectedSeasonId],
  );
  const farms = profile?.farms ?? [];
  const defaultFarmPlotId = activeSeason?.farmPlot.id ?? farms[0]?.id ?? '';
  const [selectedSourceId, setSelectedSourceId] = useState(
    defaultFarmPlotId || CURRENT_LOCATION_SOURCE,
  );
  const [soilType, setSoilType] = useState('NOT_SURE');
  const [seasonKey, setSeasonKey] = useState<SeasonKey>(() => {
    const now = new Date();
    return getSuggestedSeasonKey(now.getMonth()) as SeasonKey;
  });
  const [sowingMonth, setSowingMonth] = useState<number>(() => {
    const now = new Date();
    return now.getMonth() + 1;
  });
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CropSuggestionResponse | null>(null);
  const [hasTriggeredLocationFetch, setHasTriggeredLocationFetch] =
    useState(false);
  const {
    location,
    status: locationStatus,
    message: locationMessage,
    refreshLocation,
  } = useDeviceLocation();

  // Prediction history
  const historyQueryKey = useMemo(() => {
    const base = ['prediction-runs', token, 'CROP_SUGGESTION'];
    if (selectedSourceId !== CURRENT_LOCATION_SOURCE) {
      return [...base, selectedSourceId];
    }
    return base;
  }, [token, selectedSourceId]);

  const historyPath = useMemo(() => {
    const params = new URLSearchParams({ type: 'CROP_SUGGESTION', limit: '3' });
    if (selectedSourceId !== CURRENT_LOCATION_SOURCE) {
      params.set('farmPlotId', selectedSourceId);
    }
    return `/predictions/runs?${params.toString()}`;
  }, [selectedSourceId]);

  const historyQuery = useQuery({
    queryKey: historyQueryKey,
    queryFn: () => apiGet<{ runs: PredictionRun[] }>(historyPath, token),
    enabled: Boolean(token) && showHistory,
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    setSelectedSourceId((current) => {
      if (current === CURRENT_LOCATION_SOURCE) {
        return current;
      }

      if (farms.some((farm) => farm.id === current)) {
        return current;
      }

      return defaultFarmPlotId || CURRENT_LOCATION_SOURCE;
    });
  }, [defaultFarmPlotId, farms]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedSourceId) ?? null,
    [farms, selectedSourceId],
  );
  const usingCurrentLocation = selectedSourceId === CURRENT_LOCATION_SOURCE;

  // When season key changes (not on custom), update sowing month to season default
  useEffect(() => {
    setSowingMonth(SEASON_DEFAULT_MONTHS[seasonKey]);
  }, [seasonKey]);

  useEffect(() => {
    setSoilType(selectedFarm?.soilType ?? 'NOT_SURE');
    setMessage(null);
    setResult(null);
  }, [selectedFarm?.id, selectedFarm?.soilType, usingCurrentLocation]);

  useEffect(() => {
    if (!usingCurrentLocation) {
      if (hasTriggeredLocationFetch) {
        setHasTriggeredLocationFetch(false);
      }
      return;
    }

    if (location || locationStatus === 'loading' || hasTriggeredLocationFetch) {
      return;
    }

    setHasTriggeredLocationFetch(true);
    void refreshLocation();
  }, [
    hasTriggeredLocationFetch,
    location,
    locationStatus,
    refreshLocation,
    usingCurrentLocation,
  ]);

  const sourceOptions = useMemo(
    () => [
      ...farms.map((farm) => ({ value: farm.id, label: farm.name })),
      { value: CURRENT_LOCATION_SOURCE, label: 'Current location' },
    ],
    [farms],
  );

  const locationBadgeTone =
    locationStatus === 'ready'
      ? 'success'
      : locationStatus === 'loading'
        ? 'info'
        : 'warning';
  const locationBadgeLabel =
    locationStatus === 'ready'
      ? 'GPS ready'
      : locationStatus === 'loading'
        ? 'Finding GPS'
        : 'GPS needed';

  const handleSourceChange = (value: string) => {
    setSelectedSourceId(value);
    setMessage(null);
    setResult(null);
  };

  const handleSoilTypeChange = (value: string) => {
    setSoilType(value);
    setMessage(null);
    setResult(null);
  };

  const handleSeasonKeyChange = (value: string) => {
    setSeasonKey(value as SeasonKey);
    setMessage(null);
    setResult(null);
  };

  const seasonProfile = useMemo(
    () => ({ seasonKey, sowingMonth }),
    [seasonKey, sowingMonth],
  );

  const runPrediction = async () => {
    if (!token) {
      setMessage('Sign in again to use crop prediction.');
      return;
    }

    if (!usingCurrentLocation && !selectedFarm) {
      setMessage('Choose a plot before checking crop fit.');
      return;
    }

    if (usingCurrentLocation && !location) {
      setMessage(
        locationMessage ??
          'Current location is needed before running a new-location prediction.',
      );
      return;
    }

    if (usingCurrentLocation && !authUser?.state.trim()) {
      setMessage(
        'Your saved profile location is incomplete, so current-location prediction is unavailable right now.',
      );
      return;
    }

    setBusy(true);
    setMessage(null);

    // Strip NOT_SURE — API handles unknown soil via UNKNOWN_DEFAULT path
    const effectiveSoilType = soilType === 'NOT_SURE' ? undefined : soilType;

    try {
      const payload = usingCurrentLocation
        ? buildCurrentLocationPayload({
            state: authUser?.state ?? '',
            district: authUser?.district ?? undefined,
            village: authUser?.village ?? undefined,
            latitude: location?.latitude ?? 0,
            longitude: location?.longitude ?? 0,
            seasonProfile,
            soilType: effectiveSoilType,
          })
        : {
            farmPlotId: selectedFarm?.id,
            seasonProfile,
            soilType: effectiveSoilType,
          };

      const response = await apiPost<CropSuggestionResponse>(
        '/predictions/crop-suggestions',
        payload,
        token,
      );

      setResult(response);
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
        subtitle="Choose a plot or current location, set the season and soil type. IntelliFarm infers weather and climate automatically."
      >
        <OptionChipGroup
          title="Plot or location"
          value={selectedSourceId}
          options={sourceOptions}
          onChange={handleSourceChange}
        />

        {selectedFarm ? (
          <SunriseCard accent="soft" title="Saved plot context">
            <View style={{ gap: spacing.sm }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                }}
              >
                <MapPin color={palette.sky} size={16} />
                <Text selectable style={bodyText}>
                  {selectedFarm.village}, {selectedFarm.district}
                </Text>
              </View>
              <Text selectable style={bodyText}>
                {selectedFarm.area} acre plot with{' '}
                {formatIrrigationLabel(selectedFarm.irrigationType)} irrigation.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                <MetricBadge
                  label={
                    selectedFarm.soilType
                      ? `Saved soil ${getSoilLabel(selectedFarm.soilType)}`
                      : 'Soil not saved yet'
                  }
                  tone={selectedFarm.soilType ? 'info' : 'neutral'}
                />
              </View>
            </View>
          </SunriseCard>
        ) : (
          <SunriseCard accent="info" title="Current location context">
            <View style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                <MetricBadge label={locationBadgeLabel} tone={locationBadgeTone} />
              </View>
              <Text selectable style={bodyText}>
                {location
                  ? 'Weather and climate matching will use your phone GPS for this prediction.'
                  : locationMessage ??
                    'Allow location access so IntelliFarm can run a new-location prediction from where you are.'}
              </Text>
              {location ? (
                <Text selectable style={metaText}>
                  {formatCoordinate(location.latitude)}, {formatCoordinate(location.longitude)}
                </Text>
              ) : null}
              <Button
                label={
                  locationStatus === 'loading'
                    ? 'Reading location...'
                    : location
                      ? 'Refresh location'
                      : 'Use current location'
                }
                variant="soft"
                loading={locationStatus === 'loading'}
                onPress={() => {
                  setHasTriggeredLocationFetch(true);
                  void refreshLocation();
                }}
              />
            </View>
          </SunriseCard>
        )}

        {/* Season Selection */}
        <OptionChipGroup
          title="Season"
          value={seasonKey}
          options={seasonKeyOptions.filter((o) => o.value !== 'CUSTOM').map((o) => ({
            value: o.value,
            label: o.label,
          }))}
          onChange={handleSeasonKeyChange}
        />

        {/* Sowing Month Picker */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: palette.ink, fontFamily: typography.bodyStrong, fontSize: 14 }}>
            Sowing month
          </Text>
          <TouchableOpacity
            onPress={() => setShowMonthPicker(!showMonthPicker)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.md,
              paddingVertical: 12,
              borderRadius: radii.xl,
              borderWidth: 1,
              borderColor: palette.outline,
              backgroundColor: palette.white,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <CalendarDays color={palette.leafDark} size={16} />
              <Text style={{ color: palette.ink, fontFamily: typography.bodyStrong, fontSize: 14 }}>
                {MONTH_LABELS[sowingMonth - 1]}
              </Text>
              <MetricBadge label={seasonKey.charAt(0) + seasonKey.slice(1).toLowerCase()} tone="info" />
            </View>
            {showMonthPicker
              ? <ChevronUp color={palette.inkMuted} size={16} />
              : <ChevronDown color={palette.inkMuted} size={16} />
            }
          </TouchableOpacity>
          {showMonthPicker ? (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: spacing.xs,
                padding: spacing.sm,
                backgroundColor: palette.white,
                borderRadius: radii.xl,
                borderWidth: 1,
                borderColor: palette.outline,
              }}
            >
              {MONTH_LABELS.map((label, index) => {
                const month = index + 1;
                const active = sowingMonth === month;
                return (
                  <TouchableOpacity
                    key={month}
                    onPress={() => {
                      setSowingMonth(month);
                      setShowMonthPicker(false);
                    }}
                    style={{
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 6,
                      borderRadius: radii.pill,
                      borderWidth: 1,
                      borderColor: active ? palette.leaf : palette.outline,
                      backgroundColor: active ? palette.leaf : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        color: active ? palette.white : palette.inkSoft,
                        fontFamily: active ? typography.bodyStrong : typography.bodyRegular,
                        fontSize: 12,
                      }}
                    >
                      {label.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>

        <OptionChipGroup
          title="Soil type"
          value={soilType}
          options={soilOptions.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          onChange={handleSoilTypeChange}
        />

        {message ? (
          <SunriseCard accent="warning" title="Prediction note">
            <Text selectable style={bodyText}>
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

        {result ? (
          <View style={{ gap: spacing.md }}>
            <SectionTitle
              eyebrow="Prediction result"
              title="Best-fit crops"
              action={
                <MetricBadge
                  label={formatConfidenceLabel(result.inputConfidence)}
                  tone={confidenceToneMap[result.inputConfidence]}
                />
              }
            />

            
            <View style={{ gap: spacing.sm }}>
              {result.suggestions.slice(0, 3).map((item, index) => (
                <CompactListCard
                  key={item.cropName}
                  title={item.cropName}
                  subtitle={item.rationale}
                  meta={index === 0 ? 'Best current match' : 'Alternative fit'}
                  tone={index === 0 ? 'feature' : 'neutral'}
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
                      tone={index === 0 ? 'success' : 'info'}
                    />
                  }
                />
              ))}
            </View>

            {selectedFarm ? (
              <Button
                label="Continue to season setup"
                onPress={() =>
                  router.push({
                    pathname: '/season',
                    params: { farmPlotId: selectedFarm.id },
                  })
                }
              />
            ) : null}
          </View>
        ) : null}

        {/* Prediction History */}
        <View style={{ gap: spacing.sm }}>
          <TouchableOpacity
            onPress={() => setShowHistory(!showHistory)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              paddingVertical: spacing.xs,
            }}
          >
            <History color={palette.inkMuted} size={16} />
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyStrong,
                fontSize: 13,
                flex: 1,
              }}
            >
              Past predictions
            </Text>
            {showHistory
              ? <ChevronUp color={palette.inkMuted} size={15} />
              : <ChevronDown color={palette.inkMuted} size={15} />
            }
          </TouchableOpacity>

          {showHistory ? (
            historyQuery.isLoading ? (
              <Text style={metaText}>Loading history...</Text>
            ) : (historyQuery.data?.runs ?? []).length === 0 ? (
              <Text style={metaText}>No past predictions found for this plot.</Text>
            ) : (
              <View style={{ gap: spacing.xs }}>
                {(historyQuery.data?.runs ?? []).map((run) => {
                  const topCrop = run.outputJson?.suggestions?.[0];
                  const confidence = run.outputJson?.inputConfidence;
                  const label = run.outputJson?.seasonClimate?.label ?? '';
                  return (
                    <View
                      key={run.id}
                      style={{
                        padding: spacing.md,
                        borderRadius: radii.xl,
                        borderWidth: 1,
                        borderColor: palette.outline,
                        backgroundColor: palette.white,
                        gap: spacing.xs,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: palette.ink, fontFamily: typography.bodyStrong, fontSize: 13 }}>
                          {topCrop?.cropName ?? 'No suggestion'}
                        </Text>
                        {confidence ? (
                          <MetricBadge
                            label={formatConfidenceLabel(confidence)}
                            tone={confidenceToneMap[confidence]}
                          />
                        ) : null}
                      </View>
                      {label ? (
                        <Text style={metaText}>{label}</Text>
                      ) : null}
                      <Text style={metaText}>
                        {new Date(run.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )
          ) : null}
        </View>
      </PageShell>
    </>
  );
}

function buildCurrentLocationPayload(input: {
  state: string;
  district?: string;
  village?: string;
  latitude: number;
  longitude: number;
  seasonProfile: {
    seasonKey: SeasonKey;
    sowingMonth: number;
  };
  soilType?: string;
}) {
  return {
    explorerContext: {
      state: input.state.trim(),
      district: input.district?.trim() || undefined,
      village: input.village?.trim() || undefined,
      irrigationType: 'MANUAL' as const,
      latitude: input.latitude,
      longitude: input.longitude,
    },
    seasonProfile: input.seasonProfile,
    soilType: input.soilType || undefined,
  };
}

function formatConfidenceLabel(value: CropSuggestionResponse['inputConfidence']) {
  return value === 'HIGH'
    ? 'High confidence'
    : value === 'MEDIUM'
      ? 'Medium confidence'
      : 'Low confidence';
}

const confidenceToneMap: Record<
  CropSuggestionResponse['inputConfidence'],
  'success' | 'warning' | 'danger'
> = {
  HIGH: 'success',
  MEDIUM: 'warning',
  LOW: 'danger',
};

function formatIrrigationLabel(value: string) {
  return value.toLowerCase().replace(/_/g, ' ');
}

function getSoilLabel(value: string | null | undefined) {
  return soilOptions.find((option) => option.value === value)?.label ?? 'Not sure';
}

function formatCoordinate(value: number) {
  return value.toFixed(4);
}

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

const metaText = {
  color: palette.inkMuted,
  fontFamily: typography.bodyRegular,
  fontSize: 12,
};
