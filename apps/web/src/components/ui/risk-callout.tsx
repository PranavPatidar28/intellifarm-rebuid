import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function RiskCallout({
  title,
  tone = "warning",
  children,
  className,
}: {
  title: string;
  tone?: "info" | "success" | "warning" | "danger";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border p-4",
        tone === "info" && "border-[rgba(77,120,144,0.18)] bg-[var(--info-soft)]",
        tone === "success" && "border-[rgba(47,122,79,0.18)] bg-[var(--success-soft)]",
        tone === "warning" && "border-[rgba(154,109,27,0.18)] bg-[var(--warning-soft)]",
        tone === "danger" && "border-[rgba(181,71,60,0.18)] bg-[var(--danger-soft)]",
        className,
      )}
    >
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      <div className="mt-2 text-sm leading-6 text-[var(--foreground-soft)]">{children}</div>
    </div>
  );
}
