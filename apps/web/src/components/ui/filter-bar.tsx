import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function FilterBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface-card-strong flex flex-col gap-3 p-4 md:flex-row md:flex-wrap md:items-end",
        className,
      )}
    >
      {children}
    </div>
  );
}
