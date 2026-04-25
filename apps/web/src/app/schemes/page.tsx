"use client";

import { useDeferredValue, useMemo, useState } from "react";
import useSWR from "swr";

import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { EmptyState } from "@/components/empty-state";
import { SchemeCard } from "@/components/scheme-card";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { apiGet } from "@/lib/api";

type SchemesResponse = {
  schemes: Array<{
    id: string;
    title: string;
    titleHi?: string | null;
    description: string;
    descriptionHi?: string | null;
    category: string;
    applicableState: string;
    officialLink: string;
  }>;
};

const quickCategories = [
  "Income Support",
  "Insurance",
  "Irrigation",
  "Credit",
];

export default function SchemesPage() {
  return (
    <AuthGate>
      <SchemesContent />
    </AuthGate>
  );
}

function SchemesContent() {
  const [category, setCategory] = useState("");
  const [cropName, setCropName] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const deferredCropName = useDeferredValue(cropName);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (deferredCropName) params.set("cropName", deferredCropName);
    if (deferredSearch) params.set("search", deferredSearch);
    return params.toString();
  }, [category, deferredCropName, deferredSearch]);

  const { data } = useSWR(`/schemes?${queryString}`, () =>
    apiGet<SchemesResponse>(`/schemes${queryString ? `?${queryString}` : ""}`),
  );

  const schemes = data?.schemes ?? [];
  const featuredSchemes = schemes.slice(0, 2);

  return (
    <AppShell
      title="Schemes"
      description="Browse official schemes with clear summaries and crop or category filters so support is easier to find and verify."
      eyebrow="Support"
    >
      <FilterBar>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Crop</p>
          <Input
            value={cropName}
            onChange={(event) => setCropName(event.target.value)}
            placeholder="Crop, for example Wheat"
            className="mt-2"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Search</p>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search scheme text"
            className="mt-2"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Category</p>
          <Input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Category, for example Irrigation"
            className="mt-2"
          />
        </div>
      </FilterBar>

      <SectionCard title="Quick categories" eyebrow="Common scheme buckets" variant="glass">
        <div className="flex flex-wrap gap-2">
          {quickCategories.map((item) => (
            <Button
              key={item}
              type="button"
              variant={category === item ? "primary" : "secondary"}
              size="sm"
              onClick={() => setCategory((current) => (current === item ? "" : item))}
            >
              {item}
            </Button>
          ))}
        </div>
      </SectionCard>

      {featuredSchemes.length ? (
        <SectionCard title="Most relevant right now" eyebrow="Top matches">
          <div className="grid gap-4 xl:grid-cols-2">
            {featuredSchemes.map((scheme) => (
              <SchemeCard key={scheme.id} scheme={scheme} />
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="All matching schemes" eyebrow="Directory">
        {schemes.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {schemes.map((scheme) => (
              <SchemeCard key={scheme.id} scheme={scheme} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No schemes match this filter"
            description="Try clearing the category or search text to widen the result set."
          />
        )}
      </SectionCard>
    </AppShell>
  );
}
