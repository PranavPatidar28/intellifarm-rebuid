"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";

import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { EmptyState } from "@/components/empty-state";
import { MetricTile } from "@/components/metric-tile";
import { SchemeCard } from "@/components/scheme-card";
import { SectionCard } from "@/components/section-card";
import { TaskListCard } from "@/components/task-list-card";
import { TimelineStageCard } from "@/components/timeline-stage-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiskCallout } from "@/components/ui/risk-callout";
import { apiGet, apiPost } from "@/lib/api";
import { useCurrentLocation } from "@/lib/use-current-location";

type TimelineResponse = {
  cropSeason: {
    cropName: string;
    currentStage: string;
    tasks: Array<{
      id: string;
      title: string;
      description: string;
      dueDate: string;
      priority: "LOW" | "MEDIUM" | "HIGH";
      status: "PENDING" | "COMPLETED" | "SKIPPED" | "OVERDUE";
    }>;
  };
  stages: Array<{
    id: string;
    labelEn: string;
    startDay: number;
    endDay: number;
    sortOrder: number;
  }>;
};

type ResourcePredictionResponse = {
  resourcePrediction: {
    cropName: string;
    currentStage: string;
    weeklyWaterMm: number;
    fertilizerNeed: string;
    pesticideNeedLevel: "LOW" | "WATCH" | "HIGH";
    recommendations: string[];
    safetyNote: string;
  };
};

type SchemesResponse = {
  schemes: Array<{
    id: string;
    title: string;
    titleHi?: string | null;
    description: string;
    descriptionHi?: string | null;
    category: string;
    applicableState: string;
    officialLink: string;
  }>;
};

export default function TimelinePage() {
  return (
    <AuthGate>
      <TimelineContent />
    </AuthGate>
  );
}

function TimelineContent() {
  const params = useParams<{ id: string }>();
  const { location } = useCurrentLocation();
  const { data, mutate } = useSWR(`/crop-seasons/${params.id}/timeline`, () =>
    apiGet<TimelineResponse>(`/crop-seasons/${params.id}/timeline`),
  );
  const { data: schemesData } = useSWR(
    data?.cropSeason.cropName
      ? `/schemes?cropName=${data.cropSeason.cropName}`
      : null,
    data?.cropSeason.cropName
      ? () =>
          apiGet<SchemesResponse>(
            `/schemes?cropName=${encodeURIComponent(data.cropSeason.cropName)}`,
          )
      : null,
  );
  const [resourcePrediction, setResourcePrediction] = useState<
    ResourcePredictionResponse["resourcePrediction"] | null
  >(null);
  const [predictionMessage, setPredictionMessage] = useState<string | null>(
    null,
  );
  const [predicting, setPredicting] = useState(false);

  const runPrediction = async () => {
    setPredicting(true);
    setPredictionMessage(null);

    try {
      const response = await apiPost<ResourcePredictionResponse>(
        "/predictions/resources",
        {
          cropSeasonId: params.id,
          ...(location
            ? {
                latitude: location.latitude,
                longitude: location.longitude,
              }
            : {}),
        },
      );
      setResourcePrediction(response.resourcePrediction);
    } catch {
      setPredictionMessage("Could not fetch the resource estimate right now.");
    } finally {
      setPredicting(false);
    }
  };

  return (
    <AppShell
      title={data?.cropSeason.cropName ?? "Season timeline"}
      description="Track the season stage by stage, finish current work, and review the weekly resource estimate before acting."
      eyebrow="Field timeline"
    >
      <SectionCard
        title="Current stage"
        eyebrow="Season progress"
        action={
          <Button
            type="button"
            variant="secondary"
            onClick={runPrediction}
          >
            {predicting ? "Running estimate..." : "Run weekly estimate"}
          </Button>
        }
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{data?.cropSeason.currentStage ?? "Monitoring"}</Badge>
              <Badge tone="info">Timeline workspace</Badge>
            </div>
            <p className="text-sm leading-6 muted">
              Use the stage rail below to see what should happen next and keep
              the current crop stage aligned with weekly field work.
            </p>
          </div>
          <div className="grid gap-3">
            <MetricTile
              label="Tasks in this season"
              value={data?.cropSeason.tasks.length ?? 0}
              hint="Includes pending, complete, and overdue records."
              tone="brand"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Resource needs this week" eyebrow="Prediction">
        {resourcePrediction ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <MetricTile
                label="Water need"
                value={`${resourcePrediction.weeklyWaterMm} mm`}
                hint="Estimated weekly requirement."
                tone="sky"
              />
              <MetricTile
                label="Fertilizer review"
                value={resourcePrediction.fertilizerNeed}
                hint="Review before taking action."
                tone="accent"
              />
              <MetricTile
                label="Pesticide watch"
                value={resourcePrediction.pesticideNeedLevel}
                hint={resourcePrediction.safetyNote}
                tone={
                  resourcePrediction.pesticideNeedLevel === "HIGH"
                    ? "danger"
                    : resourcePrediction.pesticideNeedLevel === "WATCH"
                      ? "accent"
                      : "brand"
                }
              />
            </div>
            {resourcePrediction.recommendations.length ? (
              <div className="grid gap-3">
                {resourcePrediction.recommendations.map((recommendation) => (
                  <div
                    key={recommendation}
                    className="surface-card rounded-[var(--radius-card)] p-4 text-sm leading-6 text-[var(--foreground-soft)]"
                  >
                    {recommendation}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <RiskCallout title="Run the estimate when you need weekly guidance" tone="info">
            This gives a weather-linked view of water demand, fertilizer review,
            and pesticide watch level for the current season.
          </RiskCallout>
        )}
        {predictionMessage ? (
          <p className="mt-3 text-sm font-medium text-[var(--danger)]">
            {predictionMessage}
          </p>
        ) : null}
      </SectionCard>

      <SectionCard title="Stage rail" eyebrow="Configured crop stages">
        {data?.stages.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {data.stages.map((stage) => (
              <TimelineStageCard
                key={stage.id}
                stage={stage}
                active={stage.labelEn === data.cropSeason.currentStage}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No stage rules configured yet"
            description="Add stage rules in admin to make this crop timeline more actionable."
          />
        )}
      </SectionCard>

      <SectionCard title="Task timeline" eyebrow="Upcoming and overdue work">
        <TaskListCard
          tasks={data?.cropSeason.tasks ?? []}
          interactive
          onTaskUpdated={async () => {
            await mutate();
          }}
        />
      </SectionCard>

      <SectionCard title="Related schemes" eyebrow="Government support">
        {schemesData?.schemes.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {schemesData.schemes.slice(0, 4).map((scheme) => (
              <SchemeCard key={scheme.id} scheme={scheme} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No related schemes found"
            description="There are no indexed schemes for this crop and state combination yet."
          />
        )}
      </SectionCard>
    </AppShell>
  );
}
