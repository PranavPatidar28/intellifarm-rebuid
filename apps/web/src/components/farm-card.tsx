import Link from "next/link";
import { ArrowRight, MapPinned, Sparkles, Waves } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { irrigationTypeLabel, soilTypeLabel } from "@/lib/crop-prediction";
import { formatNumber } from "@/lib/format";

type FarmCardProps = {
  farm: {
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
      currentStage: string;
      status: string;
    }>;
  };
};

export function FarmCard({ farm }: FarmCardProps) {
  const activeSeasons = farm.cropSeasons.slice(0, 2);

  return (
    <article className="surface-card-strong rounded-[var(--radius-panel)] p-5 transition duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-2)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div>
            <p className="text-xl font-semibold text-[var(--foreground)]">
              {farm.name}
            </p>
            <div className="mt-2 flex items-center gap-2 text-sm muted">
              <MapPinned className="h-4 w-4" />
              <span>
                {farm.village}, {farm.district}, {farm.state}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="info">{formatNumber(farm.area)} acres</Badge>
            <Badge tone="accent">
              <Waves className="h-3.5 w-3.5" />
              {irrigationTypeLabel(farm.irrigationType)}
            </Badge>
            {farm.soilType ? (
              <Badge tone="brand">{soilTypeLabel(farm.soilType)}</Badge>
            ) : (
              <Badge tone="neutral">Soil not saved</Badge>
            )}
          </div>
        </div>

        <div className="surface-card-muted min-w-40 rounded-[var(--radius-card)] p-4">
          <p className="eyebrow">Active seasons</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)] number-data">
            {farm.cropSeasons.length}
          </p>
          <p className="mt-2 text-sm muted">
            Crops currently tracked on this plot.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <p className="eyebrow">Current crop context</p>
        {activeSeasons.length ? (
          <div className="grid gap-3">
            {activeSeasons.map((season) => (
              <div
                key={season.id}
                className="surface-card rounded-[var(--radius-card)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {season.cropName}
                  </p>
                  <Badge tone="success">{season.currentStage}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="surface-card-muted rounded-[var(--radius-card)] p-4 text-sm leading-6 muted">
            No active seasons on this plot yet. Use Plan to compare the next crop
            and start a new season.
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={`/farms/${farm.id}`} className={buttonStyles({ variant: "secondary" })}>
          Open plot details
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={`/crop-prediction?farmPlotId=${farm.id}`}
          className={buttonStyles({ variant: "tertiary" })}
        >
          <Sparkles className="h-4 w-4" />
          Plan next crop
        </Link>
      </div>
    </article>
  );
}
