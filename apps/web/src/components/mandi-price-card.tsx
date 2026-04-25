import { ChartColumnBig } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SourceBadge } from "@/components/ui/source-badge";
import { formatCurrency, formatDate } from "@/lib/format";

type MandiPriceCardProps = {
  record: {
    id: string;
    mandiName: string;
    district: string;
    state: string;
    cropName: string;
    priceModal: number;
    priceMin: number;
    priceMax: number;
    recordDate: string;
    source: string;
    distanceKm?: number | null;
  };
};

export function MandiPriceCard({ record }: MandiPriceCardProps) {
  return (
    <article className="surface-card-strong rounded-[var(--radius-panel)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--info-soft)] text-[var(--info)]">
              <ChartColumnBig className="h-5 w-5" />
            </span>
            <div>
              <p className="eyebrow">{record.cropName}</p>
              <h3 className="text-xl font-semibold text-[var(--foreground)]">
                {record.mandiName}
              </h3>
            </div>
          </div>
          <p className="text-sm muted">
            {record.district}, {record.state}
          </p>
        </div>

        <div className="surface-card-muted min-w-44 rounded-[var(--radius-card)] p-4 text-right">
          <p className="eyebrow">Modal price</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)] number-data">
            {formatCurrency(record.priceModal)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <InfoStat label="Min" value={formatCurrency(record.priceMin)} />
        <InfoStat label="Max" value={formatCurrency(record.priceMax)} />
        <InfoStat label="Date" value={formatDate(record.recordDate)} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SourceBadge label={record.source} />
        {record.distanceKm != null ? (
          <Badge tone="brand">{record.distanceKm.toFixed(1)} km away</Badge>
        ) : null}
      </div>
    </article>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card rounded-[var(--radius-card)] p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--foreground)] number-data">
        {value}
      </p>
    </div>
  );
}
