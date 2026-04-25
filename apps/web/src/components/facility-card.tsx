import { Warehouse } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SourceBadge } from "@/components/ui/source-badge";
import { formatCurrency, formatDate } from "@/lib/format";

type FacilityCardProps = {
  facility: {
    id: string;
    type: "MANDI" | "WAREHOUSE";
    name: string;
    district: string;
    state: string;
    village?: string | null;
    distanceKm: number;
    services: string[];
    latestMarket: {
      cropName: string;
      mandiName: string;
      priceMin: number;
      priceMax: number;
      priceModal: number;
      recordDate: string;
      source: string;
    } | null;
  };
};

export function FacilityCard({ facility }: FacilityCardProps) {
  return (
    <article className="surface-card-strong rounded-[var(--radius-panel)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={facility.type === "MANDI" ? "accent" : "brand"}>
              {facility.type === "MANDI" ? "Nearby mandi" : "Warehouse"}
            </Badge>
            <Badge tone="info">{facility.distanceKm.toFixed(1)} km away</Badge>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-[var(--foreground)]">
              {facility.name}
            </h3>
            <p className="mt-2 text-sm muted">
              {facility.village ? `${facility.village}, ` : ""}
              {facility.district}, {facility.state}
            </p>
          </div>
        </div>

        <div className="surface-card-muted min-w-44 rounded-[var(--radius-card)] p-4 text-right">
          <p className="eyebrow">Service count</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)] number-data">
            {facility.services.length}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {facility.services.map((service) => (
          <Badge key={service} tone="brand">
            <Warehouse className="h-3.5 w-3.5" />
            {service}
          </Badge>
        ))}
      </div>

      {facility.latestMarket ? (
        <div className="mt-5 surface-card rounded-[var(--radius-card)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-base font-semibold text-[var(--foreground)]">
                {facility.latestMarket.cropName}
              </p>
              <p className="text-sm muted">Latest mandi price snapshot</p>
            </div>
            <div className="text-right">
              <p className="eyebrow">Modal</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)] number-data">
                {formatCurrency(facility.latestMarket.priceModal)}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="surface-card-muted rounded-[var(--radius-card)] p-3">
              <p className="eyebrow">Range</p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)] number-data">
                {formatCurrency(facility.latestMarket.priceMin)} to{" "}
                {formatCurrency(facility.latestMarket.priceMax)}
              </p>
            </div>
            <div className="surface-card-muted rounded-[var(--radius-card)] p-3">
              <p className="eyebrow">Recorded</p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)] number-data">
                {formatDate(facility.latestMarket.recordDate)}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <SourceBadge label={facility.latestMarket.source} />
          </div>
        </div>
      ) : null}
    </article>
  );
}
