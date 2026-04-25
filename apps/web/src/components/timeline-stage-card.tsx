import { Badge } from "@/components/ui/badge";

type TimelineStageCardProps = {
  stage: {
    id?: string;
    labelEn: string;
    startDay: number;
    endDay: number;
    sortOrder?: number;
  };
  active?: boolean;
};

export function TimelineStageCard({
  stage,
  active = false,
}: TimelineStageCardProps) {
  return (
    <article
      className={`rounded-[var(--radius-card)] border p-4 ${
        active
          ? "border-[rgba(30,90,60,0.2)] bg-[var(--brand-soft)]"
          : "surface-card"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-base font-semibold text-[var(--foreground)]">
          {stage.labelEn}
        </p>
        <Badge tone={active ? "brand" : "neutral"}>
          Stage {stage.sortOrder ?? "-"}
        </Badge>
      </div>
      <p className="mt-3 text-sm leading-6 muted">
        Recommended between day {stage.startDay} and day {stage.endDay}.
      </p>
    </article>
  );
}
