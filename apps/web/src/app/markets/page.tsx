"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { LocateFixed } from "lucide-react";
import useSWR from "swr";

import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { EmptyState } from "@/components/empty-state";
import { FacilityCard } from "@/components/facility-card";
import { MandiPriceCard } from "@/components/mandi-price-card";
import { MetricTile } from "@/components/metric-tile";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { RiskCallout } from "@/components/ui/risk-callout";
import { Tabs } from "@/components/ui/tabs";
import { apiGet } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { useCurrentLocation } from "@/lib/use-current-location";

type FarmPlotsResponse = {
  farmPlots: Array<{
    id: string;
    name: string;
    latitude?: number | null;
    longitude?: number | null;
  }>;
};

type FacilitiesResponse = {
  facilities: Array<{
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
  }>;
};

type MarketsResponse = {
  records: Array<{
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
  }>;
  bestRecord: {
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
  } | null;
};

export default function MarketsPage() {
  return (
    <AuthGate>
      <MarketsContent />
    </AuthGate>
  );
}

function MarketsContent() {
  const [cropName, setCropName] = useState("");
  const [activeTab, setActiveTab] = useState("mandis");
  const deferredCropName = useDeferredValue(cropName);
  const { location, message, refreshLocation } = useCurrentLocation();
  const { data: farmsData } = useSWR("/farm-plots", () =>
    apiGet<FarmPlotsResponse>("/farm-plots"),
  );

  const fallbackLocation = useMemo(() => {
    const farmWithLocation = farmsData?.farmPlots.find(
      (farm) => farm.latitude != null && farm.longitude != null,
    );

    return farmWithLocation?.latitude != null &&
      farmWithLocation.longitude != null
      ? {
          latitude: farmWithLocation.latitude,
          longitude: farmWithLocation.longitude,
        }
      : null;
  }, [farmsData]);

  const activeLocation = location ?? fallbackLocation;
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (deferredCropName) params.set("cropName", deferredCropName);
    if (activeLocation) {
      params.set("latitude", activeLocation.latitude.toString());
      params.set("longitude", activeLocation.longitude.toString());
      params.set("includeDistance", "true");
    }
    return params.toString();
  }, [activeLocation, deferredCropName]);

  const { data: facilitiesData } = useSWR(
    activeLocation ? `/facilities/nearby?${queryString}` : null,
    activeLocation
      ? () =>
          apiGet<FacilitiesResponse>(
            `/facilities/nearby?${queryString}&types=MANDI,WAREHOUSE`,
          )
      : null,
  );
  const { data: marketsData } = useSWR(`/markets?${queryString}`, () =>
    apiGet<MarketsResponse>(`/markets${queryString ? `?${queryString}` : ""}`),
  );

  const mandis =
    facilitiesData?.facilities.filter(
      (facility) => facility.type === "MANDI",
    ) ?? [];
  const warehouses =
    facilitiesData?.facilities.filter(
      (facility) => facility.type === "WAREHOUSE",
    ) ?? [];

  return (
    <AppShell
      title="Market"
      description="Use GPS-first lookup to see the closest mandis and storage options, then compare recent prices before deciding where to sell or store."
      eyebrow="Market intelligence"
      actions={
        <Button
          type="button"
          variant="secondary"
          leadingIcon={<LocateFixed className="h-4 w-4" />}
          onClick={refreshLocation}
        >
          Refresh location
        </Button>
      }
    >
      <FilterBar>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Crop filter</p>
          <Input
            value={cropName}
            onChange={(event) => setCropName(event.target.value)}
            placeholder="Filter by crop, for example Wheat or Cotton"
            className="mt-2"
          />
        </div>
        <div className="surface-card rounded-[var(--radius-card)] px-4 py-3 text-sm muted">
          {message ??
            (activeLocation
              ? `Using ${activeLocation.latitude.toFixed(4)}, ${activeLocation.longitude.toFixed(4)}.`
              : "Enable GPS or save farm coordinates to unlock nearby facilities.")}
        </div>
      </FilterBar>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricTile
          label="Nearby mandis"
          value={mandis.length}
          hint="Facilities within the current lookup."
          tone="brand"
        />
        <MetricTile
          label="Warehouses"
          value={warehouses.length}
          hint="Storage options near the active location."
          tone="sky"
        />
        <MetricTile
          label="Price records"
          value={marketsData?.records.length ?? 0}
          hint="Recent mandi records in the current result set."
          tone="accent"
        />
      </div>

      {marketsData?.bestRecord ? (
        <SectionCard title="Best current opportunity" eyebrow="Within current results">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="surface-card rounded-[var(--radius-card)] p-5">
              <p className="eyebrow">{marketsData.bestRecord.cropName}</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                {marketsData.bestRecord.mandiName}
              </p>
              <p className="mt-2 text-sm muted">
                {marketsData.bestRecord.district}, {marketsData.bestRecord.state}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {marketsData.bestRecord.distanceKm != null ? (
                  <Badge tone="brand">
                    {marketsData.bestRecord.distanceKm.toFixed(1)} km away
                  </Badge>
                ) : null}
                <Badge tone="info">Best current modal price</Badge>
              </div>
            </div>
            <div className="surface-card-muted rounded-[var(--radius-card)] p-5 text-right">
              <p className="eyebrow">Modal price</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--foreground)] number-data">
                {formatCurrency(marketsData.bestRecord.priceModal)}
              </p>
            </div>
          </div>
        </SectionCard>
      ) : (
        <RiskCallout title="Location improves market quality" tone="info">
          Nearby mandi and warehouse discovery depends on live GPS or saved plot
          coordinates. Without location, the app can still show broader market records.
        </RiskCallout>
      )}

      <SectionCard title="Browse results" eyebrow="Mandis, storage, and price history">
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "mandis", label: "Mandis" },
            { value: "warehouses", label: "Warehouses" },
            { value: "prices", label: "Price history" },
          ]}
        />

        <div className="mt-5">
          {activeTab === "mandis" ? (
            mandis.length ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {mandis.map((facility) => (
                  <FacilityCard key={facility.id} facility={facility} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No nearby mandi matches"
                description="Try a different crop filter or enable live GPS to search from the current location."
              />
            )
          ) : null}

          {activeTab === "warehouses" ? (
            warehouses.length ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {warehouses.map((facility) => (
                  <FacilityCard key={facility.id} facility={facility} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No nearby warehouse matches"
                description="Warehouse discovery depends on the current location and seeded coverage in this region."
              />
            )
          ) : null}

          {activeTab === "prices" ? (
            marketsData?.records.length ? (
              <div className="grid gap-4">
                {marketsData.records.map((record) => (
                  <MandiPriceCard key={record.id} record={record} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No market records for this filter"
                description="Clear the crop filter or move to a location with seeded mandi coverage."
              />
            )
          ) : null}
        </div>
      </SectionCard>
    </AppShell>
  );
}
