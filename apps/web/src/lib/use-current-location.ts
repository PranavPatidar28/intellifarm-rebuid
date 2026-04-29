"use client";

import { useState } from "react";

const LOCATION_STORAGE_KEY = "intellifarm:last-device-location";

type CurrentLocation = {
  latitude: number;
  longitude: number;
};

type CurrentLocationState = {
  location: CurrentLocation | null;
  status: "idle" | "locating" | "ready" | "denied" | "unsupported" | "error";
  message: string | null;
  refreshLocation: () => void;
};

function readStoredLocation() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as CurrentLocation;
    if (
      typeof parsed.latitude !== "number" ||
      typeof parsed.longitude !== "number"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function useCurrentLocation(): CurrentLocationState {
  const [location, setLocation] = useState<CurrentLocation | null>(
    readStoredLocation,
  );
  const [status, setStatus] = useState<
    "idle" | "locating" | "ready" | "denied" | "unsupported" | "error"
  >(location ? "ready" : "idle");
  const [message, setMessage] = useState<string | null>(
    location
      ? "Using the last approved GPS location saved on this device."
      : null,
  );

  const refreshLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      setMessage("GPS is not available on this device.");
      return;
    }

    setStatus("locating");
    setMessage("Fetching live GPS weather...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        };

        window.localStorage.setItem(
          LOCATION_STORAGE_KEY,
          JSON.stringify(nextLocation),
        );
        setLocation(nextLocation);
        setStatus("ready");
        setMessage("Using your current GPS location for weather.");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setStatus("denied");
          setMessage(
            "Location access is blocked, so weather falls back to the saved farm location.",
          );
          return;
        }

        setStatus("error");
        setMessage(
          "Could not fetch live GPS right now. Using the saved farm location instead.",
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5 * 60 * 1000,
        timeout: 12_000,
      },
    );
  };

  return {
    location,
    status,
    message,
    refreshLocation,
  };
}
