"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-shell">
      <div className="app-frame max-w-4xl page-transition">
        <div className="surface-card-strong p-6">
          <p className="eyebrow">Error</p>
          <h1 className="mt-2 text-3xl font-semibold">This page needs another try</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 muted">
            Something interrupted the route while loading farmer data or support
            context. Retry once. If it keeps failing, refresh the app and try
            again.
          </p>
          <div className="mt-5">
            <Button onClick={reset}>Try again</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
