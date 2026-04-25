"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Search, Sprout, Tractor } from "lucide-react";
import useSWR from "swr";

import { AuthGate } from "@/components/auth-gate";
import { EmptyState } from "@/components/empty-state";
import { FarmCard } from "@/components/farm-card";
import { MetricTile } from "@/components/metric-tile";
import { ListDetailPage } from "@/components/templates/list-detail-page";
import { FilterBar } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { buttonStyles } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api";

type FarmsResponse = {
  farmPlots: Array<{
    id: string;
    name: string;
    area: number;
    irrigationType: string;
    village: string;
    district: string;
    state: string;
    soilType?: string | null;
    cropSeasons: Array<{
      id: string;
      cropName: string;
      currentStage: string;
      status: string;
    }>;
  }>;
};

export default function FarmsPage() {
  return (
    <AuthGate>
      <FarmsContent />
    </AuthGate>
  );
}

function FarmsContent() {
  const { data } = useSWR("/farm-plots", () => apiGet<FarmsResponse>("/farm-plots"));
  const farms = data?.farmPlots ?? [];
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const filteredFarms = useMemo(() => {
    if (!deferredSearch.trim()) return farms;

    const query = deferredSearch.toLowerCase();
    return farms.filter((farm) =>
      [farm.name, farm.village, farm.district, farm.state]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [deferredSearch, farms]);

  const activeSeasons = farms.flatMap((farm) => farm.cropSeasons).length;
  const totalArea = farms.reduce((sum, farm) => sum + farm.area, 0);
  const farmsWithSeasons = farms.filter((farm) => farm.cropSeasons.length > 0).length;

  return (
    <ListDetailPage
      title="Fields"
      description="Review plot records, compare current field status, and open the timeline or planning tools without digging through multiple views."
      eyebrow="Field inventory"
      actions={
        <>
          <Link href="/crop-prediction" className={buttonStyles({ variant: "secondary" })}>
            <Sprout className="h-4 w-4" />
            Plan next crop
          </Link>
          <Link href="/onboarding/farm" className={buttonStyles({ variant: "primary" })}>
            Add plot
          </Link>
        </>
      }
      list={
        <>
          <FilterBar>
            <div className="min-w-0 flex-1">
              <p className="eyebrow">Search fields</p>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by plot name, village, district, or state"
                className="mt-2"
              />
            </div>
            <div className="surface-card rounded-[var(--radius-card)] px-4 py-3 text-sm muted">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-[var(--brand)]" />
                Showing {filteredFarms.length} of {farms.length} plots
              </div>
            </div>
          </FilterBar>

          <section className="grid gap-4 md:grid-cols-2">
            {filteredFarms.length ? (
              filteredFarms.map((farm) => <FarmCard key={farm.id} farm={farm} />)
            ) : (
              <EmptyState
                title="No plots match this search"
                description="Try another location name or clear the search to see every saved field."
              />
            )}
          </section>
        </>
      }
      detail={
        <>
          <section className="surface-card-strong rounded-[var(--radius-panel)] p-5">
            <p className="eyebrow">Portfolio snapshot</p>
            <div className="mt-4 grid gap-3">
              <MetricTile
                label="Plots"
                value={farms.length}
                hint="Registered farm plots."
                tone="brand"
              />
              <MetricTile
                label="Active seasons"
                value={activeSeasons}
                hint="Current crop seasons across all fields."
                tone="accent"
              />
              <MetricTile
                label="Tracked area"
                value={`${totalArea.toFixed(1)} acres`}
                hint="Approximate total area saved in the app."
                tone="sky"
              />
            </div>
          </section>

          <section className="surface-card-strong rounded-[var(--radius-panel)] p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <Tractor className="h-5 w-5" />
              </span>
              <div>
                <p className="text-base font-semibold text-[var(--foreground)]">
                  Field discipline
                </p>
                <p className="mt-1 text-sm muted">
                  {farmsWithSeasons} plots already have at least one active or
                  historical season record.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="brand">Mobile-first field workflows</Badge>
              <Badge tone="info">Weather-linked decision support</Badge>
              <Badge tone="accent">Plan next crop from any plot</Badge>
            </div>
          </section>
        </>
      }
    />
  );
}
