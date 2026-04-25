import type { ReactNode } from "react";

import { MetricCard } from "./ui/metric-card";

type MetricTileProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "brand" | "sky" | "accent" | "danger";
};

export function MetricTile({
  label,
  value,
  hint,
  tone = "brand",
}: MetricTileProps) {
  return (
    <MetricCard
      label={label}
      value={<span className="number-data">{value}</span>}
      hint={hint}
      tone={tone === "sky" ? "info" : tone}
    />
  );
}
