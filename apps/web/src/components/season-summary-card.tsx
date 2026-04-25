import Link from "next/link";
import { ArrowRight, Sprout, Tractor } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

type SeasonSummaryCardProps = {
  season: {
    cropSeasonId: string;
    cropName: string;
    sowingDate: string;
    currentStage: string;
    farmPlotName: string;
  };
  summary?: string;
};

export function SeasonSummaryCard({
  season,
  summary,
}: SeasonSummaryCardProps) {
  return (
    <article className="hero-panel rounded-[var(--radius-hero)] p-5 md:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">Active season</Badge>
            <Badge tone="accent">{season.currentStage}</Badge>
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-sm text-white/76">
              <Tractor className="h-4 w-4" />
              {season.farmPlotName}
            </div>
            <h3 className="font-display text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
              {season.cropName}
            </h3>
            <p className="max-w-2xl text-sm leading-7 text-white/78 md:text-base">
              {summary ??
                "This season is active now. Stay ahead of weather-linked work, crop checks, and decision support before risk compounds."}
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:min-w-52">
          <div className="rounded-[var(--radius-card)] border border-white/12 bg-white/10 p-4 text-white">
            <p className="eyebrow !text-white/65">Sowing date</p>
            <p className="mt-2 text-base font-semibold">{formatDate(season.sowingDate)}</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-white/12 bg-white/10 p-4 text-white">
            <div className="flex items-center gap-2">
              <Sprout className="h-4 w-4 text-[var(--accent)]" />
              <p className="eyebrow !text-white/65">Current stage</p>
            </div>
            <p className="mt-2 text-base font-semibold">{season.currentStage}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/seasons/${season.cropSeasonId}/timeline`}
          className={buttonStyles({ variant: "secondary", size: "md" })}
        >
          Open timeline
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/disease-help"
          className={buttonStyles({ variant: "tertiary", size: "md" })}
        >
          Report crop issue
        </Link>
      </div>
    </article>
  );
}
