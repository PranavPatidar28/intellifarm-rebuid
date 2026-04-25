"use client";

import { cn } from "@/lib/cn";

export type TabOption = {
  value: string;
  label: string;
};

export function Tabs({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: TabOption[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-[calc(var(--radius-card)+2px)] border border-[var(--border)] bg-[rgba(255,255,255,0.78)] p-1",
        className,
      )}
      role="tablist"
      aria-label="Sections"
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-10 whitespace-nowrap rounded-[0.85rem] px-3.5 py-2 text-sm font-medium transition",
              active
                ? "bg-[var(--brand)] text-white shadow-[var(--shadow-1)]"
                : "text-[var(--foreground-soft)] hover:bg-[var(--surface-muted)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
