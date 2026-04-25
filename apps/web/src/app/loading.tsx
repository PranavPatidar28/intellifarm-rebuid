import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="page-shell">
      <div className="app-frame max-w-5xl page-transition">
        <div className="surface-card-strong p-6">
          <p className="eyebrow">Loading</p>
          <h2 className="mt-2 text-2xl font-semibold">Preparing the farmer workspace</h2>
          <div className="mt-5 space-y-3">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-28 w-full rounded-[var(--radius-panel)]" />
            <div className="grid gap-3 md:grid-cols-2">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
