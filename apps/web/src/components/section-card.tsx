import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type SectionCardProps = {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  variant?: "solid" | "glass";
  className?: string;
};

export function SectionCard({
  title,
  eyebrow,
  action,
  children,
  variant = "solid",
  className,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        variant === "glass" ? "surface-card-muted" : "surface-card-strong",
        "p-5 md:p-6",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="max-w-2xl">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2 className="mt-1 text-xl font-semibold md:text-[1.35rem]">
            {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
