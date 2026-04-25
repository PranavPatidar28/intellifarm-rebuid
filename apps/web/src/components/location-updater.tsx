"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCurrentLocation } from "@/lib/use-current-location";

export function LocationUpdater() {
  const { location } = useCurrentLocation();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (location) {
      const currentLat = searchParams.get("latitude");
      const currentLng = searchParams.get("longitude");
      if (
        currentLat !== String(location.latitude) ||
        currentLng !== String(location.longitude)
      ) {
        const newParams = new URLSearchParams(searchParams);
        newParams.set("latitude", String(location.latitude));
        newParams.set("longitude", String(location.longitude));
        // Use replace without scrolling so we don't jank the page view
        router.replace(`?${newParams.toString()}`, { scroll: false });
      }
    }
  }, [location, router, searchParams]);

  return null;
}
