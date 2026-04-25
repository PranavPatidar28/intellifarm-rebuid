"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LocateFixed, MapPinned, Sparkles, TestTube2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";

import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { EmptyState } from "@/components/empty-state";
import { MetricTile } from "@/components/metric-tile";
import { SectionCard } from "@/components/section-card";
import { ConfidenceBadge } from "@/components/ui/confidence-badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RiskCallout } from "@/components/ui/risk-callout";
import { Select } from "@/components/ui/select";
import { SourceBadge } from "@/components/ui/source-badge";
import { Tabs } from "@/components/ui/tabs";
import { ApiError, apiGet, apiPatch, apiPost } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  irrigationTypeLabel,
  monthOptions,
  seasonLabel,
  seasonOptions,
  soilTypeLabel,
  soilTypeOptions,
} from "@/lib/crop-prediction";
import { formatDate } from "@/lib/format";
import { useCurrentLocation } from "@/lib/use-current-location";

type PredictionMode = "saved" | "explore";

type FarmsResponse = {
  farmPlots: Array<{
    id: string;
    name: string;
    state: string;
    district: string;
    village: string;
    area: number;
    irrigationType: string;
    latitude?: number | null;
    longitude?: number | null;
    soilType?: string | null;
    cropSeasons: Array<{
      id: string;
      cropName: string;
      currentStage: string;
      status: string;
    }>;
  }>;
};

type CropPredictionResponse = {
  prediction: {
    id: string;
    type: "CROP_SUGGESTION";
    provider: string;
    status: "COMPLETED" | "FAILED";
    createdAt: string;
  };
  suggestions: Array<{
    cropName: string;
    score: number;
    rationale: string;
  }>;
  inputConfidence: "HIGH" | "MEDIUM" | "LOW";
  soilProfile: {
    soilType?: string | null;
    source:
      | "ADVANCED_METRICS"
      | "PAGE_SOIL_TYPE"
      | "PLOT_SAVED_SOIL_TYPE"
      | "UNKNOWN_DEFAULT";
    summary: string;
  };
  seasonClimate: {
    method: "HISTORICAL_MONTHLY" | "CURRENT_FALLBACK";
    averageTempC: number;
    averageHumidityPercent: number;
    totalRainfallMm: number;
    label: string;
    locationLabel: string;
  };
  assumptions: string[];
  weather: {
    currentTemperatureC: number;
    humidityPercent: number;
    rainfallExpectedMm: number;
  };
};

type PredictionRunsResponse = {
  runs: Array<{
    id: string;
    type: "CROP_SUGGESTION" | "RESOURCE_ESTIMATE";
    provider: string;
    status: "COMPLETED" | "FAILED";
    createdAt: string;
    outputJson?: {
      suggestions?: Array<{
        cropName: string;
        score: number;
        rationale: string;
      }>;
      inputConfidence?: "HIGH" | "MEDIUM" | "LOW";
      seasonClimate?: {
        label?: string;
      };
    };
  }>;
};

export default function CropPredictionPage() {
  return (
    <AuthGate>
      <CropPredictionContent />
    </AuthGate>
  );
}

function CropPredictionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedFarmPlotId = searchParams.get("farmPlotId");
  const returnTo = searchParams.get("returnTo");
  const {
    location,
    message: gpsMessage,
    refreshLocation,
  } = useCurrentLocation();

  const { data: farmsData, mutate: mutateFarms } = useSWR("/farm-plots", () =>
    apiGet<FarmsResponse>("/farm-plots"),
  );

  const farms = useMemo(() => farmsData?.farmPlots ?? [], [farmsData]);
  const [mode, setMode] = useState<PredictionMode>("saved");
  const [selectedFarmPlotId, setSelectedFarmPlotId] = useState(
    requestedFarmPlotId ?? "",
  );
  const [seasonKey, setSeasonKey] = useState<
    "KHARIF" | "RABI" | "ZAID" | "CUSTOM"
  >("KHARIF");
  const [sowingMonth, setSowingMonth] = useState(6);
  const [soilType, setSoilType] = useState<string>("NOT_SURE");
  const [explorerContext, setExplorerContext] = useState({
    state: "Punjab",
    district: "",
    village: "",
    irrigationType: "FLOOD",
    latitude: "",
    longitude: "",
  });
  const [advancedMetrics, setAdvancedMetrics] = useState({
    n: "",
    p: "",
    k: "",
    ph: "",
  });
  const [pendingExplorerGpsApply, setPendingExplorerGpsApply] = useState(false);
  const [predictionResult, setPredictionResult] =
    useState<CropPredictionResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingSoil, setIsSavingSoil] = useState(false);

  useEffect(() => {
    if (requestedFarmPlotId) {
      setSelectedFarmPlotId(requestedFarmPlotId);
      setMode("saved");
    }
  }, [requestedFarmPlotId]);

  useEffect(() => {
    if (!farmsData) {
      return;
    }

    if (!farms.length) {
      setMode("explore");
      return;
    }

    setSelectedFarmPlotId((current) => current || farms[0].id);
  }, [farms, farmsData]);

  useEffect(() => {
    if (seasonKey === "CUSTOM") {
      return;
    }

    const matchedSeason = seasonOptions.find((option) => option.value === seasonKey);
    if (matchedSeason) {
      setSowingMonth(matchedSeason.month);
    }
  }, [seasonKey]);

  useEffect(() => {
    if (!pendingExplorerGpsApply || !location) {
      return;
    }

    setExplorerContext((current) => ({
      ...current,
      latitude: location.latitude.toFixed(6),
      longitude: location.longitude.toFixed(6),
    }));
    setPendingExplorerGpsApply(false);
  }, [location, pendingExplorerGpsApply]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmPlotId) ?? null,
    [farms, selectedFarmPlotId],
  );

  useEffect(() => {
    if (mode === "saved" && selectedFarm?.soilType) {
      setSoilType(selectedFarm.soilType);
      return;
    }

    setSoilType((current) => current || "NOT_SURE");
  }, [mode, selectedFarm?.soilType]);

  const historyPath = useMemo(() => {
    const query = new URLSearchParams({
      type: "CROP_SUGGESTION",
      limit: "6",
    });

    if (mode === "saved" && selectedFarmPlotId) {
      query.set("farmPlotId", selectedFarmPlotId);
    }

    return `/predictions/runs?${query.toString()}`;
  }, [mode, selectedFarmPlotId]);

  const { data: historyData, mutate: mutateHistory } = useSWR(historyPath, () =>
    apiGet<PredictionRunsResponse>(historyPath),
  );

  const predictionContextDescription =
    mode === "saved"
      ? "Use a saved plot to combine field location, irrigation setup, saved soil type, and live climate matching."
      : "Explore another location by choosing the area, irrigation type, and optional GPS pin before comparing crops.";

  const runPrediction = async () => {
    setMessage(null);

    let payload:
      | ReturnType<typeof buildSavedPlotPayload>
      | ReturnType<typeof buildExplorerPayload>;
    let soilMetrics: { n: number; p: number; k: number; ph: number } | undefined;
    try {
      soilMetrics = buildAdvancedSoilMetrics(advancedMetrics);
      payload =
        mode === "saved"
          ? buildSavedPlotPayload({
              farmPlotId: selectedFarmPlotId,
              soilType,
              soilMetrics,
              seasonKey,
              sowingMonth,
              location,
            })
          : buildExplorerPayload({
              explorerContext,
              soilType,
              soilMetrics,
              seasonKey,
              sowingMonth,
            });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Complete all advanced soil values or leave them blank.",
      );
      return;
    }

    if (!payload) {
      setMessage(
        mode === "saved"
          ? "Select a saved plot before running crop prediction."
          : "State and irrigation type are required before running crop prediction.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiPost<CropPredictionResponse>(
        "/predictions/crop-suggestions",
        payload,
      );
      setPredictionResult(response);
      await mutateHistory();
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? "The crop prediction service did not accept this input. Review the season, soil, or location details."
          : "Could not run crop prediction right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveSoilTypeToPlot = async () => {
    if (!selectedFarmPlotId || mode !== "saved" || !soilType || soilType === "NOT_SURE") {
      setMessage("Choose a confirmed soil type before saving it to the plot.");
      return;
    }

    setIsSavingSoil(true);
    setMessage(null);
    try {
      await apiPatch(`/farm-plots/${selectedFarmPlotId}`, {
        soilType,
      });
      await mutateFarms();
      setMessage("Saved the soil type to this plot for future predictions.");
    } catch {
      setMessage("Could not save the soil type to this plot.");
    } finally {
      setIsSavingSoil(false);
    }
  };

  const handleUseCrop = (cropName: string) => {
    router.push(buildCropChoiceHref(cropName, returnTo, selectedFarmPlotId));
  };

  return (
    <AppShell
      title="Plan"
      description="Compare likely crop fit for the next season using a saved plot or a new location, then review the assumptions before you decide."
      eyebrow="Crop planning"
      actions={
        <>
          {returnTo ? (
            <Link href={returnTo} className={buttonStyles({ variant: "secondary" })}>
              Back to onboarding
            </Link>
          ) : null}
          <Button
            type="button"
            variant="tertiary"
            leadingIcon={<LocateFixed className="h-4 w-4" />}
            onClick={refreshLocation}
          >
            Refresh location
          </Button>
        </>
      }
    >
      <SectionCard title="Choose planning mode" eyebrow="Input context">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <Tabs
              value={mode}
              onChange={(value) => setMode(value as PredictionMode)}
              options={[
                { value: "saved", label: "Saved plot" },
                { value: "explore", label: "Explore new location" },
              ]}
            />

            <RiskCallout title="What the model uses" tone="info">
              {predictionContextDescription}
            </RiskCallout>

            {mode === "saved" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Saved plot"
                  htmlFor="saved-plot"
                  className="md:col-span-2"
                >
                  <Select
                    id="saved-plot"
                    value={selectedFarmPlotId}
                    onChange={(event) => setSelectedFarmPlotId(event.target.value)}
                  >
                    <option value="">Select a plot</option>
                    {farms.map((farm) => (
                      <option key={farm.id} value={farm.id}>
                        {farm.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                {selectedFarm ? (
                  <>
                    <MetricTile
                      label="Location"
                      value={`${selectedFarm.village}, ${selectedFarm.district}`}
                      hint={selectedFarm.state}
                      tone="brand"
                    />
                    <MetricTile
                      label="Irrigation"
                      value={irrigationTypeLabel(selectedFarm.irrigationType)}
                      hint="Saved on this plot."
                      tone="accent"
                    />
                    <MetricTile
                      label="Saved soil"
                      value={soilTypeLabel(selectedFarm.soilType)}
                      hint="This can be updated below."
                      tone="sky"
                    />
                    <MetricTile
                      label="Active seasons"
                      value={selectedFarm.cropSeasons.length}
                      hint="Recent crop records on this plot."
                      tone="brand"
                    />
                  </>
                ) : (
                  <div className="md:col-span-2">
                    <EmptyState
                      title="Choose a plot first"
                      description="Select one saved plot to use its location and setup as the default planning context."
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="State" htmlFor="explore-state" required>
                  <Input
                    id="explore-state"
                    value={explorerContext.state}
                    onChange={(event) =>
                      setExplorerContext((current) => ({
                        ...current,
                        state: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Irrigation type" htmlFor="explore-irrigation" required>
                  <Select
                    id="explore-irrigation"
                    value={explorerContext.irrigationType}
                    onChange={(event) =>
                      setExplorerContext((current) => ({
                        ...current,
                        irrigationType: event.target.value,
                      }))
                    }
                  >
                    <option value="RAIN_FED">Rain fed</option>
                    <option value="DRIP">Drip</option>
                    <option value="SPRINKLER">Sprinkler</option>
                    <option value="FLOOD">Flood</option>
                    <option value="MANUAL">Manual</option>
                  </Select>
                </Field>
                <Field label="District" htmlFor="explore-district">
                  <Input
                    id="explore-district"
                    value={explorerContext.district}
                    onChange={(event) =>
                      setExplorerContext((current) => ({
                        ...current,
                        district: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Village" htmlFor="explore-village">
                  <Input
                    id="explore-village"
                    value={explorerContext.village}
                    onChange={(event) =>
                      setExplorerContext((current) => ({
                        ...current,
                        village: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Latitude" htmlFor="explore-latitude">
                  <Input
                    id="explore-latitude"
                    value={explorerContext.latitude}
                    onChange={(event) =>
                      setExplorerContext((current) => ({
                        ...current,
                        latitude: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Longitude" htmlFor="explore-longitude">
                  <Input
                    id="explore-longitude"
                    value={explorerContext.longitude}
                    onChange={(event) =>
                      setExplorerContext((current) => ({
                        ...current,
                        longitude: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="surface-card rounded-[var(--radius-card)] p-4">
              <p className="eyebrow">Location note</p>
              <p className="mt-2 text-sm leading-6 muted">
                {gpsMessage ??
                  "Live GPS is used when available. Otherwise the planner falls back to the saved plot or broader location context."}
              </p>
            </div>
            {mode === "explore" ? (
              <Button
                type="button"
                variant="secondary"
                block
                leadingIcon={<MapPinned className="h-4 w-4" />}
                onClick={() => {
                  setPendingExplorerGpsApply(true);
                  refreshLocation();
                }}
              >
                Use current GPS here
              </Button>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Season and soil profile" eyebrow="Model setup">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-5">
            <div>
              <p className="eyebrow">Season window</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {seasonOptions.map((option) => (
                  <SelectableOption
                    key={option.value}
                    active={seasonKey === option.value}
                    title={option.label}
                    description={
                      option.value === "CUSTOM"
                        ? "Choose your own sowing month."
                        : `Default sowing month: ${monthOptions.find((month) => month.value === option.month)?.label}`
                    }
                    onClick={() => setSeasonKey(option.value)}
                  />
                ))}
              </div>
            </div>

            <Field
              label="Sowing month"
              htmlFor="sowing-month"
              hint={`Climate is matched to ${seasonLabel(seasonKey)} around ${monthOptions.find((month) => month.value === sowingMonth)?.label}.`}
            >
              <Select
                id="sowing-month"
                value={sowingMonth}
                onChange={(event) => setSowingMonth(Number(event.target.value))}
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="space-y-5">
            <div>
              <p className="eyebrow">Soil profile</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {soilTypeOptions.map((option) => (
                  <SelectableOption
                    key={option.value}
                    active={soilType === option.value}
                    title={option.label}
                    description={option.detail}
                    onClick={() => setSoilType(option.value)}
                  />
                ))}
              </div>
            </div>

            <details className="surface-card rounded-[var(--radius-card)] p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[var(--foreground)]">
                <span className="inline-flex items-center gap-2">
                  <TestTube2 className="h-4 w-4 text-[var(--brand)]" />
                  Advanced soil values
                </span>
                <span className="text-xs uppercase tracking-[0.14em] muted">
                  Optional
                </span>
              </summary>
              <p className="mt-3 text-sm leading-6 muted">
                Only use this if you already have exact soil test values. Leave
                all four fields empty to let the app use the farmer-friendly soil
                profile above.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Nitrogen (N)" htmlFor="soil-n">
                  <Input
                    id="soil-n"
                    value={advancedMetrics.n}
                    onChange={(event) =>
                      setAdvancedMetrics((current) => ({
                        ...current,
                        n: event.target.value,
                      }))
                    }
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Phosphorus (P)" htmlFor="soil-p">
                  <Input
                    id="soil-p"
                    value={advancedMetrics.p}
                    onChange={(event) =>
                      setAdvancedMetrics((current) => ({
                        ...current,
                        p: event.target.value,
                      }))
                    }
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Potassium (K)" htmlFor="soil-k">
                  <Input
                    id="soil-k"
                    value={advancedMetrics.k}
                    onChange={(event) =>
                      setAdvancedMetrics((current) => ({
                        ...current,
                        k: event.target.value,
                      }))
                    }
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Soil pH" htmlFor="soil-ph">
                  <Input
                    id="soil-ph"
                    value={advancedMetrics.ph}
                    onChange={(event) =>
                      setAdvancedMetrics((current) => ({
                        ...current,
                        ph: event.target.value,
                      }))
                    }
                    placeholder="Optional"
                  />
                </Field>
              </div>
            </details>
          </div>
        </div>

        {message ? (
          <p className="mt-5 text-sm font-medium text-[var(--danger)]">{message}</p>
        ) : null}

        <div className="sticky-footer mt-6">
          <div className="surface-card-strong rounded-[var(--radius-panel)] p-4">
            <Button
              type="button"
              variant="primary"
              size="lg"
              block
              disabled={isSubmitting}
              leadingIcon={<Sparkles className="h-4 w-4" />}
              onClick={runPrediction}
            >
              {isSubmitting ? "Running crop prediction..." : "Run crop prediction"}
            </Button>
          </div>
        </div>
      </SectionCard>

      {predictionResult ? (
        <>
          <SectionCard title="Prediction summary" eyebrow="Assumptions and confidence">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <ConfidenceBadge value={predictionResult.inputConfidence} />
                  <SourceBadge
                    label={
                      predictionResult.seasonClimate.method === "HISTORICAL_MONTHLY"
                        ? "Historical climate"
                        : "Current weather fallback"
                    }
                  />
                  <SourceBadge label={predictionResult.prediction.provider} />
                </div>

                <div className="surface-card rounded-[var(--radius-card)] p-5">
                  <p className="text-lg font-semibold text-[var(--foreground)]">
                    {predictionResult.seasonClimate.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 muted">
                    {predictionResult.soilProfile.summary}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm leading-6 muted">
                    {predictionResult.assumptions.map((assumption) => (
                      <li key={assumption} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
                        <span>{assumption}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {mode === "saved" &&
                soilType &&
                soilType !== "NOT_SURE" &&
                selectedFarm ? (
                  <div className="surface-card rounded-[var(--radius-card)] p-4">
                    <p className="text-base font-semibold text-[var(--foreground)]">
                      Save this soil profile
                    </p>
                    <p className="mt-2 text-sm leading-6 muted">
                      Save {soilTypeLabel(soilType)} to {selectedFarm.name} so
                      future predictions start with this soil context.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-4"
                      onClick={saveSoilTypeToPlot}
                      disabled={isSavingSoil}
                    >
                      {isSavingSoil ? "Saving soil type..." : "Save this soil type"}
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3">
                <MetricTile
                  label="Average temperature"
                  value={`${predictionResult.seasonClimate.averageTempC}C`}
                  hint="Typical climate fit for the selected season window."
                  tone="brand"
                />
                <MetricTile
                  label="Average humidity"
                  value={`${predictionResult.seasonClimate.averageHumidityPercent}%`}
                  hint="Used by the crop model."
                  tone="sky"
                />
                <MetricTile
                  label="Rainfall signal"
                  value={`${predictionResult.seasonClimate.totalRainfallMm} mm`}
                  hint="Average rainfall context for the selected month."
                  tone="accent"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Top crop matches" eyebrow="Comparison">
            <DataTable
              data={predictionResult.suggestions}
              rowKey={(suggestion) => suggestion.cropName}
              columns={[
                {
                  key: "crop",
                  label: "Crop",
                  render: (suggestion) => (
                    <div className="space-y-1">
                      <p className="font-semibold text-[var(--foreground)]">
                        {suggestion.cropName}
                      </p>
                      <p className="text-xs muted">
                        {suggestion === predictionResult.suggestions[0]
                          ? "Best current match"
                          : "Alternative option"}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "fit",
                  label: "Fit score",
                  render: (suggestion) => (
                    <span className="font-semibold text-[var(--brand)] number-data">
                      {(suggestion.score * 100).toFixed(0)}%
                    </span>
                  ),
                },
                {
                  key: "rationale",
                  label: "Why it fits",
                  render: (suggestion) => (
                    <p className="max-w-xl leading-6 text-[var(--foreground-soft)]">
                      {suggestion.rationale}
                    </p>
                  ),
                },
                {
                  key: "action",
                  label: "Action",
                  render: (suggestion) => (
                    <Button
                      type="button"
                      variant={
                        suggestion === predictionResult.suggestions[0]
                          ? "primary"
                          : "secondary"
                      }
                      size="sm"
                      onClick={() => handleUseCrop(suggestion.cropName)}
                    >
                      Use this crop
                    </Button>
                  ),
                },
              ]}
              mobileCard={(suggestion) => (
                <article
                  className={cn(
                    "rounded-[var(--radius-panel)] border p-5",
                    suggestion === predictionResult.suggestions[0]
                      ? "border-[rgba(30,90,60,0.2)] bg-[var(--brand-soft)]"
                      : "surface-card",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[var(--foreground)]">
                        {suggestion.cropName}
                      </p>
                      <p className="mt-1 text-sm muted">
                        {(suggestion.score * 100).toFixed(0)}% fit
                      </p>
                    </div>
                    {suggestion === predictionResult.suggestions[0] ? (
                      <BadgeChip>Best match</BadgeChip>
                    ) : null}
                  </div>
                  <p className="mt-4 text-sm leading-6 muted">
                    {suggestion.rationale}
                  </p>
                  <Button
                    type="button"
                    variant={
                      suggestion === predictionResult.suggestions[0]
                        ? "primary"
                        : "secondary"
                    }
                    className="mt-5"
                    onClick={() => handleUseCrop(suggestion.cropName)}
                  >
                    Use this crop
                  </Button>
                </article>
              )}
            />
          </SectionCard>
        </>
      ) : null}

      <SectionCard title="Recent planning history" eyebrow="Past runs">
        {historyData?.runs.length ? (
          <DataTable
            data={historyData.runs}
            rowKey={(run) => run.id}
            columns={[
              {
                key: "date",
                label: "Date",
                render: (run) => formatDate(run.createdAt),
              },
              {
                key: "top",
                label: "Top crop",
                render: (run) =>
                  run.outputJson?.suggestions?.[0]?.cropName ?? "Prediction run",
              },
              {
                key: "confidence",
                label: "Confidence",
                render: (run) =>
                  run.outputJson?.inputConfidence ? (
                    <ConfidenceBadge value={run.outputJson.inputConfidence} />
                  ) : (
                    <span className="text-sm muted">Not stored</span>
                  ),
              },
              {
                key: "context",
                label: "Climate context",
                render: (run) =>
                  run.outputJson?.seasonClimate?.label ?? "Stored context available",
              },
            ]}
          />
        ) : (
          <EmptyState
            title="No planning history yet"
            description="Run the first crop prediction to start saving crop-fit history for this plot or location."
          />
        )}
      </SectionCard>
    </AppShell>
  );
}

function SelectableOption({
  title,
  description,
  active,
  onClick,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[var(--radius-card)] border p-4 text-left transition",
        active
          ? "border-[rgba(30,90,60,0.2)] bg-[var(--brand-soft)]"
          : "surface-card hover:shadow-[var(--shadow-1)]",
      )}
    >
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      <p className="mt-2 text-sm leading-6 muted">{description}</p>
    </button>
  );
}

function BadgeChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-7 items-center rounded-full bg-[var(--brand)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
      {children}
    </span>
  );
}

function buildAdvancedSoilMetrics(input: {
  n: string;
  p: string;
  k: string;
  ph: string;
}) {
  const values = Object.values(input).filter((value) => value.trim().length > 0);

  if (!values.length) {
    return undefined;
  }

  if (values.length !== 4) {
    throw new Error(
      "Complete all advanced soil fields or leave them blank so the app can use the soil profile instead.",
    );
  }

  const parsed = {
    n: Number(input.n),
    p: Number(input.p),
    k: Number(input.k),
    ph: Number(input.ph),
  };

  if (Object.values(parsed).some((value) => !Number.isFinite(value))) {
    throw new Error(
      "Advanced soil values must be valid numbers before the model can use them.",
    );
  }

  return parsed;
}

function buildSavedPlotPayload(input: {
  farmPlotId: string;
  soilType: string;
  soilMetrics?: { n: number; p: number; k: number; ph: number };
  seasonKey: "KHARIF" | "RABI" | "ZAID" | "CUSTOM";
  sowingMonth: number;
  location: { latitude: number; longitude: number } | null;
}) {
  if (!input.farmPlotId) {
    return null;
  }

  return {
    farmPlotId: input.farmPlotId,
    seasonProfile: {
      seasonKey: input.seasonKey,
      sowingMonth: input.sowingMonth,
    },
    soilType: input.soilType,
    soilMetrics: input.soilMetrics,
    ...(input.location
      ? {
          latitude: input.location.latitude,
          longitude: input.location.longitude,
        }
      : {}),
  };
}

function buildExplorerPayload(input: {
  explorerContext: {
    state: string;
    district: string;
    village: string;
    irrigationType: string;
    latitude: string;
    longitude: string;
  };
  soilType: string;
  soilMetrics?: { n: number; p: number; k: number; ph: number };
  seasonKey: "KHARIF" | "RABI" | "ZAID" | "CUSTOM";
  sowingMonth: number;
}) {
  if (!input.explorerContext.state.trim() || !input.explorerContext.irrigationType) {
    return null;
  }

  const hasLatitude = input.explorerContext.latitude.trim().length > 0;
  const hasLongitude = input.explorerContext.longitude.trim().length > 0;

  if (hasLatitude !== hasLongitude) {
    throw new Error(
      "Add both latitude and longitude, or leave both blank for a broader location fallback.",
    );
  }

  const latitude = hasLatitude ? Number(input.explorerContext.latitude) : undefined;
  const longitude = hasLongitude
    ? Number(input.explorerContext.longitude)
    : undefined;

  if (
    (latitude != null && !Number.isFinite(latitude)) ||
    (longitude != null && !Number.isFinite(longitude))
  ) {
    throw new Error("Location coordinates must be valid numbers.");
  }

  return {
    explorerContext: {
      state: input.explorerContext.state.trim(),
      district: input.explorerContext.district.trim() || undefined,
      village: input.explorerContext.village.trim() || undefined,
      irrigationType: input.explorerContext.irrigationType,
      ...(latitude != null && longitude != null
        ? {
            latitude,
            longitude,
          }
        : {}),
    },
    seasonProfile: {
      seasonKey: input.seasonKey,
      sowingMonth: input.sowingMonth,
    },
    soilType: input.soilType,
    soilMetrics: input.soilMetrics,
  };
}

function buildCropChoiceHref(
  cropName: string,
  returnTo: string | null,
  farmPlotId: string,
) {
  if (returnTo) {
    const separator = returnTo.includes("?") ? "&" : "?";
    return `${returnTo}${separator}cropName=${encodeURIComponent(cropName)}`;
  }

  if (farmPlotId) {
    return `/onboarding/season?farmPlotId=${farmPlotId}&cropName=${encodeURIComponent(cropName)}`;
  }

  return `/onboarding/farm?cropName=${encodeURIComponent(cropName)}`;
}
