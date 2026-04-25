import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type FieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string | null;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  const describedBy = [hint ? `${htmlFor}-hint` : null, error ? `${htmlFor}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-[var(--foreground)]"
        >
          {label}
          {required ? <span className="ml-1 text-[var(--danger)]">*</span> : null}
        </label>
      </div>
      <div aria-describedby={describedBy || undefined}>{children}</div>
      {hint ? (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="text-sm muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          className="text-sm font-medium text-[var(--danger)]"
          aria-live="polite"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
