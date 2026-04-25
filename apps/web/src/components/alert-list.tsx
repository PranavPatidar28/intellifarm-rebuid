import { AlertTriangle, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type AlertListProps = {
  alerts: Array<{
    id: string;
    title: string;
    message: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  }>;
};

const severityTone: Record<
  AlertListProps["alerts"][number]["severity"],
  "warning" | "danger"
> = {
  LOW: "warning",
  MEDIUM: "warning",
  HIGH: "danger",
  CRITICAL: "danger",
};

export function AlertList({ alerts }: AlertListProps) {
  if (!alerts.length) {
    return (
      <div className="surface-card-muted rounded-[var(--radius-card)] p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--success-soft)] text-[var(--success)]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <p className="text-base font-semibold text-[var(--foreground)]">
              No urgent alerts right now
            </p>
            <p className="text-sm leading-6 muted">
              Keep a regular field walk going and review the next weather update
              before major input decisions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {alerts.map((alert) => (
        <article
          key={alert.id}
          className="surface-card rounded-[var(--radius-card)] p-4"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--danger-soft)] text-[var(--danger)]">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--foreground)] md:text-base">
                  {alert.title}
                </p>
                <Badge tone={severityTone[alert.severity]}>
                  {alert.severity === "CRITICAL" ? "Critical" : alert.severity}
                </Badge>
              </div>
              <p className="text-sm leading-6 muted">{alert.message}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
