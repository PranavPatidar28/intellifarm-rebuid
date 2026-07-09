import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  ChevronUp,
  CloudSun,
  Droplets,
  MapPin,
  ShieldAlert,
  Sparkles,
  Sprout,
  TrendingUp,
  Wheat,
} from 'lucide-react-native';

import { Button } from '@/components/button';
import { MetricBadge } from '@/components/metric-badge';
import { PageShell } from '@/components/page-shell';
import { SelectField } from '@/components/select-field';
import { SunriseCard } from '@/components/sunrise-card';
import { useSession } from '@/features/session/session-provider';
import { useDeviceLocation } from '@/hooks/use-device-location';
import { ApiError, apiPost } from '@/lib/api';
import type { CropRecommendation, CropSuggestionResponse } from '@/lib/api-types';
import {
  irrigationOptions,
  seasonKeyOptions,
  soilOptions,
  waterSupplyOptions,
} from '@/lib/constants';
import { findSeasonContext, getSuggestedSeasonKey } from '@/lib/domain';
import { useStoredValue } from '@/lib/storage';
import { palette, radii, spacing, typography } from '@/theme/tokens';

const CURRENT_LOCATION_SOURCE = 'CURRENT_LOCATION';
type SeasonKey = 'KHARIF' | 'RABI' | 'ZAID';

const SEASON_DEFAULT_MONTHS: Record<SeasonKey, number> = {
  KHARIF: 6,
  RABI: 11,
  ZAID: 3,
};

export default function CropPredictionRoute() {
  const router = useRouter();
  const { authUser, profile, token } = useSession();
  const gps = useDeviceLocation();
  const [selectedSeasonId] = useStoredValue('intellifarm:selectedSeasonId', '');
  const activeSeason = useMemo(
    () => findSeasonContext(profile, selectedSeasonId),
    [profile, selectedSeasonId],
  );
  const farms = profile?.farms ?? [];
  const defaultFarmPlotId = activeSeason?.farmPlot.id ?? farms[0]?.id ?? '';

  // ─── Form state ────────────────────────────────────────
  const [selectedSourceId, setSelectedSourceId] = useState(
    defaultFarmPlotId || CURRENT_LOCATION_SOURCE,
  );
  const [soilType, setSoilType] = useState('NOT_SURE');
  const [seasonKey, setSeasonKey] = useState<SeasonKey>(() =>
    getSuggestedSeasonKey(new Date().getMonth()) as SeasonKey,
  );
  const [waterSupply, setWaterSupply] = useState('MODERATE');
  const [irrigationType, setIrrigationType] = useState('MANUAL');
  const [farmSizeText, setFarmSizeText] = useState('2.5');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CropSuggestionResponse | null>(null);
  const [expandedCropIndex, setExpandedCropIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedSourceId((c) => {
      if (c === CURRENT_LOCATION_SOURCE) return c;
      if (farms.some((f) => f.id === c)) return c;
      return defaultFarmPlotId || CURRENT_LOCATION_SOURCE;
    });
  }, [defaultFarmPlotId, farms]);

  const selectedFarm = useMemo(
    () => farms.find((f) => f.id === selectedSourceId) ?? null,
    [farms, selectedSourceId],
  );

  const usingCurrentLocation = selectedSourceId === CURRENT_LOCATION_SOURCE;

  // Auto-trigger GPS when "current location" is selected
  useEffect(() => {
    if (usingCurrentLocation && gps.status === 'idle') {
      void gps.refreshLocation();
    }
  }, [usingCurrentLocation, gps.status, gps.refreshLocation]);

  useEffect(() => {
    setSoilType(selectedFarm?.soilType ?? 'NOT_SURE');
    setMessage(null);
    setResult(null);
  }, [selectedFarm?.id, selectedFarm?.soilType]);

  const sourceOptions = useMemo(
    () => [
      ...farms.map((f) => ({ value: f.id, label: f.name })),
      { value: CURRENT_LOCATION_SOURCE, label: '📍 Use current location' },
    ],
    [farms],
  );

  const clearResult = useCallback(() => {
    setMessage(null);
    setResult(null);
  }, []);

  // ─── Derived labels for data sources summary ───────────
  const locationLabel = usingCurrentLocation
    ? gps.location?.label ?? authUser?.district ?? authUser?.state ?? 'GPS'
    : `${selectedFarm?.name ?? 'Farm'} — ${selectedFarm?.district ?? ''}`;

  const weatherLabel = `5-year ${seasonKeyOptions.find((o) => o.value === seasonKey)?.label ?? seasonKey} averages`;

  const soilLabel =
    soilType !== 'NOT_SURE'
      ? soilOptions.find((o) => o.value === soilType)?.label ?? soilType
      : 'Not confirmed';

  // ─── Run prediction ────────────────────────────────────
  const runPrediction = async () => {
    if (!token) {
      setMessage('Sign in again to use crop prediction.');
      return;
    }
    if (!usingCurrentLocation && !selectedFarm) {
      setMessage('Choose a plot before checking crop fit.');
      return;
    }

    setBusy(true);
    setMessage(null);
    setExpandedCropIndex(null);

    const effectiveSoilType = soilType === 'NOT_SURE' ? undefined : soilType;
    const sowingMonth = SEASON_DEFAULT_MONTHS[seasonKey];
    const farmSizeAcre = parseFloat(farmSizeText) || 2.5;

    try {
      const payload = usingCurrentLocation
        ? {
            explorerContext: {
              state: authUser?.state ?? '',
              district: authUser?.district ?? undefined,
              village: authUser?.village ?? undefined,
              irrigationType: irrigationType as 'MANUAL',
              farmSizeAcre,
              ...(gps.location
                ? {
                    latitude: gps.location.latitude,
                    longitude: gps.location.longitude,
                  }
                : {}),
            },
            seasonProfile: { seasonKey, sowingMonth },
            soilType: effectiveSoilType,
            waterSupplyLevel: waterSupply,
          }
        : {
            farmPlotId: selectedFarm?.id,
            seasonProfile: { seasonKey, sowingMonth },
            soilType: effectiveSoilType,
            waterSupplyLevel: waterSupply,
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
        eyebrow="AI prediction"
        title="Smart crop recommendation"
        subtitle="Get AI-powered crop recommendations with yield estimates, profit projections, and risk analysis."
      >
        {/* ─── Input Section ─── */}
        <SelectField
          label="Plot or location"
          value={selectedSourceId}
          options={sourceOptions}
          onChange={(v) => {
            setSelectedSourceId(v);
            clearResult();
          }}
        />

        {/* GPS status for current location */}
        {usingCurrentLocation ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              paddingHorizontal: spacing.sm,
            }}
          >
            {gps.status === 'loading' ? (
              <>
                <ActivityIndicator size="small" color={palette.leaf} />
                <Text style={{ ...bodyText, color: palette.inkSoft }}>
                  Fetching GPS location…
                </Text>
              </>
            ) : gps.status === 'ready' && gps.location ? (
              <>
                <MapPin color={palette.leaf} size={14} />
                <Text style={{ ...bodyText, color: palette.leafDark }}>
                  Near {gps.location.label}
                </Text>
              </>
            ) : gps.status === 'error' ? (
              <>
                <MapPin color={palette.terracotta} size={14} />
                <Text style={{ ...bodyText, color: palette.inkSoft }}>
                  Using profile: {authUser?.district || authUser?.state || 'India'}
                </Text>
              </>
            ) : null}
          </View>
        ) : selectedFarm ? (
          <PlotContextCard farm={selectedFarm} />
        ) : null}

        <SelectField
          label="Season"
          value={seasonKey}
          options={seasonKeyOptions.map((o) => ({
            value: o.value,
            label: o.label,
            description: o.description,
          }))}
          onChange={(v) => {
            setSeasonKey(v as SeasonKey);
            clearResult();
          }}
        />

        <SelectField
          label="Soil type"
          value={soilType}
          options={soilOptions.map((o) => ({ value: o.value, label: o.label }))}
          onChange={(v) => {
            setSoilType(v);
            clearResult();
          }}
        />

        <SelectField
          label="Water supply"
          value={waterSupply}
          options={waterSupplyOptions.map((o) => ({
            value: o.value,
            label: o.label,
            description: o.description,
          }))}
          onChange={(v) => {
            setWaterSupply(v);
            clearResult();
          }}
        />

        {/* Explorer-only fields */}
        {usingCurrentLocation ? (
          <View style={{ gap: spacing.md }}>
            <SelectField
              label="Irrigation type"
              value={irrigationType}
              options={irrigationOptions.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              onChange={(v) => {
                setIrrigationType(v);
                clearResult();
              }}
            />

            <View style={{ gap: spacing.xs }}>
              <Text
                style={{
                  color: palette.ink,
                  fontFamily: typography.bodyStrong,
                  fontSize: 14,
                }}
              >
                Farm size (acres)
              </Text>
              <TextInput
                value={farmSizeText}
                onChangeText={(t) => {
                  setFarmSizeText(t);
                  clearResult();
                }}
                keyboardType="decimal-pad"
                placeholder="e.g. 2.5"
                placeholderTextColor={palette.inkMuted}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: 14,
                  borderRadius: radii.lg,
                  backgroundColor: palette.white,
                  borderWidth: 1,
                  borderColor: palette.outline,
                  color: palette.ink,
                  fontFamily: typography.bodyStrong,
                  fontSize: 15,
                }}
              />
            </View>
          </View>
        ) : null}

        {/* Data sources summary */}
        <SunriseCard accent="soft" title="Data sources">
          <View style={{ gap: 6 }}>
            <DataSourceRow
              icon={<MapPin color={palette.sky} size={13} />}
              label="Location"
              value={locationLabel}
            />
            <DataSourceRow
              icon={<CloudSun color="#F59E0B" size={13} />}
              label="Weather"
              value={weatherLabel}
            />
            <DataSourceRow
              icon={<Sprout color={palette.leaf} size={13} />}
              label="Soil"
              value={soilLabel}
            />
            <DataSourceRow
              icon={<Droplets color="#3B82F6" size={13} />}
              label="Water"
              value={waterSupplyOptions.find((o) => o.value === waterSupply)?.label ?? waterSupply}
            />
            {usingCurrentLocation ? (
              <DataSourceRow
                icon={<Sprout color={palette.inkSoft} size={13} />}
                label="Farm size"
                value={`${farmSizeText || '2.5'} acres`}
              />
            ) : null}
          </View>
        </SunriseCard>

        {message ? (
          <SunriseCard accent="warning" title="Note">
            <Text selectable style={bodyText}>{message}</Text>
          </SunriseCard>
        ) : null}

        <Button
          label={busy ? 'Analyzing crops...' : 'Run AI crop prediction'}
          loading={busy}
          onPress={() => void runPrediction()}
        />

        {/* ─── Results ─── */}
        {result ? (
          <View style={{ gap: spacing.lg }}>
            {result.cropMustNotBeGrown ? (
              <CropAvoidWarning cropName={result.cropMustNotBeGrown} />
            ) : null}

            <ClimateContextRow result={result} />

            {result.topCrops.map((crop, index) => (
              <CropRecommendationCard
                key={crop.cropName}
                crop={crop}
                rank={index + 1}
                isExpanded={expandedCropIndex === index}
                onToggle={() =>
                  setExpandedCropIndex(expandedCropIndex === index ? null : index)
                }
                farmPlotId={selectedFarm?.id}
                router={router}
              />
            ))}

            {result.assumptions.length > 0 ? (
              <AssumptionsCard assumptions={result.assumptions} />
            ) : null}
          </View>
        ) : null}
      </PageShell>
    </>
  );
}

function DataSourceRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      {icon}
      <Text style={{ color: palette.inkMuted, fontFamily: typography.bodyRegular, fontSize: 12, width: 62 }}>
        {label}
      </Text>
      <Text style={{ flex: 1, color: palette.ink, fontFamily: typography.bodyStrong, fontSize: 12 }}>
        {value}
      </Text>
    </View>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function PlotContextCard({ farm }: { farm: { name: string; village: string; district: string; area: number; irrigationType: string; soilType?: string | null } }) {
  return (
    <SunriseCard accent="soft" title="Plot context">
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <MapPin color={palette.sky} size={14} />
          <Text style={bodyText}>{farm.village}, {farm.district}</Text>
        </View>
        <Text style={bodyText}>
          {farm.area} acre · {farm.irrigationType.toLowerCase().replace(/_/g, ' ')} irrigation
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <MetricBadge
            label={farm.soilType ? soilOptions.find((o) => o.value === farm.soilType)?.label ?? 'Not sure' : 'Soil not set'}
            tone={farm.soilType ? 'info' : 'neutral'}
          />
        </View>
      </View>
    </SunriseCard>
  );
}

function CropAvoidWarning({ cropName }: { cropName: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radii.xl,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
      }}
    >
      <ShieldAlert color="#DC2626" size={20} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#991B1B', fontFamily: typography.bodyStrong, fontSize: 13 }}>
          Avoid growing {cropName}
        </Text>
        <Text style={{ color: '#B91C1C', fontFamily: typography.bodyRegular, fontSize: 12, marginTop: 2 }}>
          The AI model recommends against this crop for your conditions.
        </Text>
      </View>
    </View>
  );
}

function ClimateContextRow({ result }: { result: CropSuggestionResponse }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <MiniMetric
        icon={<TrendingUp color="#F59E0B" size={14} />}
        label="Temp"
        value={`${result.weather.currentTemperatureC}°C`}
        bg="#FFFBEB"
      />
      <MiniMetric
        icon={<Droplets color="#3B82F6" size={14} />}
        label="Humidity"
        value={`${result.weather.humidityPercent}%`}
        bg="#EFF6FF"
      />
      <MiniMetric
        icon={<Droplets color="#10B981" size={14} />}
        label="Rain"
        value={`${result.weather.rainfallExpectedMm}mm`}
        bg="#ECFDF5"
      />
    </View>
  );
}

function MiniMetric({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string; bg: string }) {
  return (
    <View
      style={{
        flex: 1,
        padding: spacing.sm,
        borderRadius: radii.lg,
        backgroundColor: bg,
        alignItems: 'center',
        gap: 4,
      }}
    >
      {icon}
      <Text style={{ fontFamily: typography.bodyRegular, fontSize: 10, color: palette.inkMuted }}>{label}</Text>
      <Text style={{ fontFamily: typography.bodyStrong, fontSize: 13, color: palette.ink }}>{value}</Text>
    </View>
  );
}

function CropRecommendationCard({
  crop,
  rank,
  isExpanded,
  onToggle,
  farmPlotId,
  router,
}: {
  crop: CropRecommendation;
  rank: number;
  isExpanded: boolean;
  onToggle: () => void;
  farmPlotId?: string;
  router: ReturnType<typeof useRouter>;
}) {
  const isProfitable = crop.averageProfitRs > 0;
  const riskColor = crop.failureRiskPct > 50 ? '#DC2626' : crop.failureRiskPct > 20 ? '#F59E0B' : '#10B981';
  const riskLabel = crop.failureRiskPct > 50 ? 'High risk' : crop.failureRiskPct > 20 ? 'Medium risk' : 'Low risk';
  const rankColors = ['#10B981', '#3B82F6', '#8B5CF6'];
  const rankBg = ['#ECFDF5', '#EFF6FF', '#F5F3FF'];

  return (
    <View
      style={{
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: rank === 1 ? '#BBF7D0' : palette.outline,
        backgroundColor: palette.white,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
        <View style={{ padding: spacing.md, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 12,
                  backgroundColor: rankBg[rank - 1] ?? rankBg[2],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sprout color={rankColors[rank - 1] ?? rankColors[2]} size={16} />
              </View>
              <View>
                <Text style={{ fontFamily: typography.bodyStrong, fontSize: 15, color: palette.ink }}>
                  {crop.cropName}
                </Text>
                <Text style={{ fontFamily: typography.bodyRegular, fontSize: 11, color: palette.inkMuted }}>
                  {rank === 1 ? 'Best match' : `Option #${rank}`}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: radii.pill,
                  backgroundColor: rankBg[rank - 1] ?? rankBg[2],
                }}
              >
                <Text style={{ fontFamily: typography.bodyStrong, fontSize: 12, color: rankColors[rank - 1] ?? rankColors[2] }}>
                  Score {crop.finalScore.toFixed(0)}
                </Text>
              </View>
              {isExpanded ? (
                <ChevronUp color={palette.inkMuted} size={16} />
              ) : (
                <ChevronDown color={palette.inkMuted} size={16} />
              )}
            </View>
          </View>

          {/* Key metrics row */}
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <MetricPill
              icon={<Wheat color={isProfitable ? '#10B981' : '#DC2626'} size={12} />}
              label={`₹${formatCompact(crop.averageProfitRs)}`}
              sublabel={isProfitable ? 'profit' : 'loss'}
              bg={isProfitable ? '#ECFDF5' : '#FEF2F2'}
              textColor={isProfitable ? '#059669' : '#DC2626'}
            />
            <MetricPill
              icon={<BarChart3 color="#3B82F6" size={12} />}
              label={`${crop.averageYieldTonnePerHectare} t/ha`}
              sublabel="yield"
              bg="#EFF6FF"
              textColor="#2563EB"
            />
            <MetricPill
              icon={<ShieldAlert color={riskColor} size={12} />}
              label={`${crop.failureRiskPct}%`}
              sublabel={riskLabel}
              bg={crop.failureRiskPct > 50 ? '#FEF2F2' : crop.failureRiskPct > 20 ? '#FFFBEB' : '#ECFDF5'}
              textColor={riskColor}
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded details */}
      {isExpanded ? (
        <View style={{ borderTopWidth: 1, borderTopColor: palette.outline }}>
          {/* Financial breakdown */}
          <View style={{ padding: spacing.md, gap: spacing.sm }}>
            <Text style={{ fontFamily: typography.bodyStrong, fontSize: 13, color: palette.ink }}>
              Financial outlook
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <FinanceRow label="Revenue" value={crop.averageRevenueRs} positive />
              <FinanceRow label="Cost" value={crop.estimatedCostRs} positive={false} />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <FinanceRow label="Profit" value={crop.averageProfitRs} positive={crop.averageProfitRs > 0} />
            </View>
          </View>

          {/* Yield range */}
          <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.xs }}>
            <Text style={{ fontFamily: typography.bodyStrong, fontSize: 13, color: palette.ink }}>
              Yield range (t/ha)
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <ArrowDownRight color="#DC2626" size={12} />
                <Text style={{ fontFamily: typography.bodyRegular, fontSize: 12, color: '#DC2626' }}>
                  {crop.worstCaseYieldTonnePerHectare}
                </Text>
              </View>
              <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: '#E5E7EB', overflow: 'hidden' }}>
                <View
                  style={{
                    width: `${Math.min(100, (crop.averageYieldTonnePerHectare / Math.max(crop.bestCaseYieldTonnePerHectare, 1)) * 100)}%`,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#10B981',
                  }}
                />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <ArrowUpRight color="#10B981" size={12} />
                <Text style={{ fontFamily: typography.bodyRegular, fontSize: 12, color: '#10B981' }}>
                  {crop.bestCaseYieldTonnePerHectare}
                </Text>
              </View>
            </View>
          </View>

          {/* RAG Explanations */}
          {crop.ragExplanation.length > 0 ? (
            <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm }}>
              <Text style={{ fontFamily: typography.bodyStrong, fontSize: 13, color: palette.ink }}>
                AI analysis
              </Text>
              {crop.ragExplanation.map((section) => (
                <View
                  key={section.heading}
                  style={{
                    padding: spacing.sm,
                    borderRadius: radii.lg,
                    backgroundColor: '#F9FAFB',
                    gap: 4,
                  }}
                >
                  <Text style={{ fontFamily: typography.bodyStrong, fontSize: 12, color: palette.leafDark }}>
                    {section.heading}
                  </Text>
                  <Text style={{ fontFamily: typography.bodyRegular, fontSize: 11, color: palette.inkSoft, lineHeight: 16 }}>
                    {section.text}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Suggestion */}
          <View
            style={{
              marginHorizontal: spacing.md,
              marginBottom: spacing.md,
              padding: spacing.sm,
              borderRadius: radii.lg,
              backgroundColor: '#F0FDF4',
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: spacing.xs,
            }}
          >
            <Sparkles color="#10B981" size={14} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontFamily: typography.bodyRegular, fontSize: 12, color: '#166534', lineHeight: 17 }}>
              {crop.suggestion}
            </Text>
          </View>

          {/* CTA */}
          {farmPlotId ? (
            <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
              <Button
                label={`Plan ${crop.cropName} season`}
                variant="soft"
                onPress={() =>
                  router.push({
                    pathname: '/season',
                    params: { farmPlotId },
                  })
                }
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function MetricPill({
  icon,
  label,
  sublabel,
  bg,
  textColor,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  bg: string;
  textColor: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: radii.lg,
        backgroundColor: bg,
      }}
    >
      {icon}
      <View>
        <Text style={{ fontFamily: typography.bodyStrong, fontSize: 12, color: textColor }}>{label}</Text>
        <Text style={{ fontFamily: typography.bodyRegular, fontSize: 9, color: textColor, opacity: 0.7 }}>{sublabel}</Text>
      </View>
    </View>
  );
}

function FinanceRow({ label, value, positive }: { label: string; value: number; positive: boolean }) {
  return (
    <View
      style={{
        flex: 1,
        padding: spacing.sm,
        borderRadius: radii.lg,
        backgroundColor: '#F9FAFB',
        gap: 2,
      }}
    >
      <Text style={{ fontFamily: typography.bodyRegular, fontSize: 10, color: palette.inkMuted }}>{label}</Text>
      <Text
        style={{
          fontFamily: typography.bodyStrong,
          fontSize: 14,
          color: positive ? '#059669' : '#DC2626',
        }}
      >
        ₹{formatCompact(Math.abs(value))}
      </Text>
    </View>
  );
}

function AssumptionsCard({ assumptions }: { assumptions: string[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? assumptions : assumptions.slice(0, 2);

  return (
    <View
      style={{
        padding: spacing.md,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: palette.outline,
        backgroundColor: palette.white,
        gap: spacing.sm,
      }}
    >
      <Text style={{ fontFamily: typography.bodyStrong, fontSize: 13, color: palette.ink }}>
        Model assumptions
      </Text>
      {visible.map((a) => (
        <View key={a} style={{ flexDirection: 'row', gap: spacing.xs }}>
          <Text style={{ color: palette.leafDark, fontSize: 10, marginTop: 3 }}>●</Text>
          <Text style={{ flex: 1, fontFamily: typography.bodyRegular, fontSize: 11, color: palette.inkSoft, lineHeight: 16 }}>
            {a}
          </Text>
        </View>
      ))}
      {assumptions.length > 2 ? (
        <TouchableOpacity onPress={() => setShowAll(!showAll)}>
          <Text style={{ fontFamily: typography.bodyStrong, fontSize: 11, color: palette.leaf }}>
            {showAll ? 'Show less' : `Show all ${assumptions.length} assumptions`}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* ─── Helpers ──────────────────────────────────────────────── */

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

const bodyText = {
  color: palette.inkSoft,
  fontFamily: typography.bodyRegular,
  fontSize: 13,
  lineHeight: 19,
};
