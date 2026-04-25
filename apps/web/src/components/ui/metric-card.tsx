import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type MetricTone = "brand" | "accent" | "info" | "success" | "warning" | "danger";

export function MetricCard({
  label,
  value,
  hint,
  tone = "brand",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: MetricTone;
  className?: string;
}) {
  return (
    <article className={cn("surface-card h-full p-4", className)}>
      <p className="eyebrow">{label}</p>
      <div className="mt-3 flex items-end gap-3">
        <p
          className={cn(
            "text-2xl font-semibold leading-none",
            tone === "brand" && "text-[var(--brand)]",
            tone === "accent" && "text-[var(--accent)]",
            tone === "info" && "text-[var(--info)]",
            tone === "success" && "text-[var(--success)]",
            tone === "warning" && "text-[var(--warning)]",
            tone === "danger" && "text-[var(--danger)]",
          )}
        >
          {value}
        </p>
      </div>
      {hint ? <p className="mt-3 text-sm muted">{hint}</p> : null}
    </article>
  );
}
