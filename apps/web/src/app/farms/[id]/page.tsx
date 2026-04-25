"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Sprout, Tractor } from "lucide-react";
import useSWR from "swr";

import { AuthGate } from "@/components/auth-gate";
import { EmptyState } from "@/components/empty-state";
import { MetricTile } from "@/components/metric-tile";
import { SectionCard } from "@/components/section-card";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { apiGet } from "@/lib/api";
import { irrigationTypeLabel, soilTypeLabel } from "@/lib/crop-prediction";
import { formatDate, formatNumber } from "@/lib/format";

type FarmDetailResponse = {
  farmPlot: {
    id: string;
    name: string;
    area: number;
    irrigationType: string;
    village: string;
    district: string;
    state: string;
    soilType?: string | null;
    cropSeasons: Array<{
      id: string;
      cropName: string;
      sowingDate: string;
      currentStage: string;
      status: string;
      tasks: Array<{
        id: string;
        title: string;
        dueDate: string;
        status: string;
      }>;
    }>;
  };
};

export default function FarmDetailPage() {
  return (
    <AuthGate>
      <FarmDetailContent />
    </AuthGate>
  );
}

function FarmDetailContent() {
  const params = useParams<{ id: string }>();
  const { data } = useSWR(`/farm-plots/${params.id}`, () =>
    apiGet<FarmDetailResponse>(`/farm-plots/${params.id}`),
  );

  const farm = data?.farmPlot;

  return (
    <AppShell
      title={farm?.name ?? "Field detail"}
      description="Review the plot setup, active seasons, and the next likely actions for this location."
      eyebrow="Field detail"
      actions={
        farm ? (
          <>
            <Link
              href={`/crop-prediction?farmPlotId=${farm.id}`}
              className={buttonStyles({ variant: "secondary" })}
            >
              <Sprout className="h-4 w-4" />
              Plan next crop
            </Link>
            <Link
              href="/farms"
              className={buttonStyles({ variant: "tertiary" })}
            >
              Back to all fields
            </Link>
          </>
        ) : null
      }
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_320px]">
        <SectionCard title="Plot overview" eyebrow="Saved field context">
          {farm ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{farm.village}</Badge>
                <Badge tone="info">{farm.district}</Badge>
                <Badge tone="accent">{farm.state}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <MetricTile
                  label="Area"
                  value={`${formatNumber(farm.area)} acres`}
                  hint="Approximate field size."
                  tone="sky"
                />
                <MetricTile
                  label="Irrigation"
                  value={irrigationTypeLabel(farm.irrigationType)}
                  hint="Current irrigation setup."
                  tone="accent"
                />
                <MetricTile
                  label="Soil profile"
                  value={soilTypeLabel(farm.soilType)}
                  hint="Saved for planning and predictions."
                  tone="brand"
                />
                <MetricTile
                  label="Seasons"
                  value={farm.cropSeasons.length}
                  hint="Active or historical crop seasons."
                  tone="brand"
                />
              </div>
            </div>
          ) : (
            <p className="text-sm muted">Loading field details...</p>
          )}
        </SectionCard>

        <section className="surface-card-strong rounded-[var(--radius-panel)] p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <Tractor className="h-5 w-5" />
            </span>
            <div>
              <p className="eyebrow">Field use</p>
              <p className="mt-2 text-base font-semibold text-[var(--foreground)]">
                Keep the current crop and the next action visible.
              </p>
              <p className="mt-2 text-sm leading-6 muted">
                This detail view is now the control point for opening season
                timelines, checking task snapshots, and planning the next cycle.
              </p>
            </div>
          </div>
        </section>
      </div>

      <SectionCard title="Crop seasons" eyebrow="Timeline and work">
        {farm?.cropSeasons.length ? (
          <div className="grid gap-4">
            {farm.cropSeasons.map((season) => (
              <article
                key={season.id}
                className="surface-card-strong rounded-[var(--radius-panel)] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="success">{season.currentStage}</Badge>
                      <Badge tone="info">{season.status}</Badge>
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-[var(--foreground)]">
                        {season.cropName}
                      </p>
                      <p className="mt-2 text-sm muted">
                        Sown on {formatDate(season.sowingDate)}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/seasons/${season.id}/timeline`}
                    className={buttonStyles({ variant: "secondary" })}
                  >
                    Open timeline
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {season.tasks.slice(0, 4).map((task) => (
                    <div
                      key={task.id}
                      className="surface-card rounded-[var(--radius-card)] p-4"
                    >
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {task.title}
                      </p>
                      <p className="mt-2 text-sm muted">
                        {formatDate(task.dueDate)} - {task.status}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No crop seasons on this plot yet"
            description="Create a season for this plot to start task generation and weather-linked support."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href={`/crop-prediction?farmPlotId=${params.id}`}
                  className={buttonStyles({ variant: "secondary" })}
                >
                  Predict crop first
                </Link>
                <Link
                  href={`/onboarding/season?farmPlotId=${params.id}`}
                  className={buttonStyles({ variant: "primary" })}
                >
                  Create crop season
                </Link>
              </div>
            }
          />
        )}
      </SectionCard>
    </AppShell>
  );
}
