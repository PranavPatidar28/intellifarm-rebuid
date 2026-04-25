import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function UiEmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface-card-muted rounded-[var(--radius-panel)] border-dashed p-6 text-center",
        className,
      )}
    >
      <p className="text-lg font-semibold text-[var(--foreground)]">{title}</p>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 muted">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
