import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type DataColumn<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  className?: string;
};

export function DataTable<T>({
  data,
  columns,
  rowKey,
  empty,
  mobileCard,
  className,
}: {
  data: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  mobileCard?: (row: T) => ReactNode;
  className?: string;
}) {
  if (!data.length) {
    return empty ?? null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="hidden overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border)] bg-white xl:block">
        <table className="min-w-full border-collapse">
          <thead className="bg-[var(--surface-muted)]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={rowKey(row)} className="border-t border-[var(--border)]">
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-4 py-3 align-top text-sm", column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 xl:hidden">
        {data.map((row) =>
          mobileCard ? (
            <div key={rowKey(row)}>{mobileCard(row)}</div>
          ) : (
            <article
              key={rowKey(row)}
              className="surface-card rounded-[var(--radius-card)] p-4"
            >
              <div className="grid gap-3">
                {columns.map((column) => (
                  <div key={column.key} className="grid gap-1">
                    <p className="eyebrow">{column.label}</p>
                    <div className="text-sm text-[var(--foreground-soft)]">
                      {column.render(row)}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ),
        )}
      </div>
    </div>
  );
}
