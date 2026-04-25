"use client";

import { CloudRain, Volume2, VolumeX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiskCallout } from "@/components/ui/risk-callout";
import { SourceBadge } from "@/components/ui/source-badge";
import { useTextToSpeech } from "@/lib/use-text-to-speech";

type WeatherCardProps = {
  weather: {
    currentTemperatureC: number;
    forecastSummary: string;
    rainfallExpectedMm: number;
    advisories: string[];
    forecastDays: Array<{
      date: string;
      maxTemperatureC: number;
      minTemperatureC: number;
      rainfallMm: number;
    }>;
    source: string;
    locationSource:
      | "DEVICE_GPS"
      | "FARM_PLOT"
      | "STATE_FALLBACK"
      | "COUNTRY_FALLBACK"
      | "SNAPSHOT_FALLBACK"
      | "SAFE_FALLBACK";
    locationLabel: string;
  } | null;
};

const sourceToneMap: Record<
  NonNullable<WeatherCardProps["weather"]>["locationSource"],
  "success" | "warning" | "danger"
> = {
  DEVICE_GPS: "success",
  FARM_PLOT: "success",
  STATE_FALLBACK: "warning",
  COUNTRY_FALLBACK: "warning",
  SNAPSHOT_FALLBACK: "warning",
  SAFE_FALLBACK: "danger",
};

const sourceLabelMap: Record<
  NonNullable<WeatherCardProps["weather"]>["locationSource"],
  string
> = {
  DEVICE_GPS: "Live GPS",
  FARM_PLOT: "Saved plot",
  STATE_FALLBACK: "State fallback",
  COUNTRY_FALLBACK: "India fallback",
  SNAPSHOT_FALLBACK: "Saved snapshot",
  SAFE_FALLBACK: "Safe fallback",
};

export function WeatherCard({ weather }: WeatherCardProps) {
  const speech = useTextToSpeech();

  if (!weather) {
    return (
      <section className="surface-card rounded-[var(--radius-panel)] p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--info-soft)] text-[var(--info)]">
            <CloudRain className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <p className="eyebrow">Weather</p>
            <p className="text-lg font-semibold text-[var(--foreground)]">
              Weather summary not ready
            </p>
            <p className="text-sm leading-6 muted">
              Add plot coordinates or use live GPS when you need sharper local
              forecasts and nearby market context.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const narration = `${weather.forecastSummary} ${weather.advisories.join(" ")}`.trim();

  return (
    <section className="surface-card-strong rounded-[var(--radius-panel)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--info-soft)] text-[var(--info)]">
              <CloudRain className="h-5 w-5" />
            </span>
            <div>
              <p className="eyebrow">Weather and advisories</p>
              <p className="text-xl font-semibold text-[var(--foreground)]">
                Field weather outlook
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={sourceToneMap[weather.locationSource]}>
              {sourceLabelMap[weather.locationSource]}
            </Badge>
            <SourceBadge label={weather.source} />
          </div>
        </div>

        <div className="grid min-w-48 gap-3 sm:grid-cols-2 sm:items-start xl:min-w-56 xl:grid-cols-1">
          <div className="surface-card-muted rounded-[var(--radius-card)] p-4 text-right">
            <p className="eyebrow">Current temp</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--foreground)] number-data">
              {Math.round(weather.currentTemperatureC)}C
            </p>
          </div>
          <div className="surface-card-muted rounded-[var(--radius-card)] p-4 text-right">
            <p className="eyebrow">Rain watch</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)] number-data">
              {weather.rainfallExpectedMm.toFixed(1)} mm
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="surface-card-muted rounded-[var(--radius-card)] p-4">
            <p className="text-sm font-medium text-[var(--foreground)]">
              {weather.locationLabel}
            </p>
            <p className="mt-2 text-sm leading-6 muted">
              {weather.forecastSummary}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {weather.forecastDays.map((day) => (
              <div
                key={day.date}
                className="surface-card rounded-[var(--radius-card)] p-4"
              >
                <p className="eyebrow">{day.date}</p>
                <p className="mt-2 text-base font-semibold text-[var(--foreground)] number-data">
                  {Math.round(day.maxTemperatureC)}C / {Math.round(day.minTemperatureC)}C
                </p>
                <p className="mt-2 text-sm muted">
                  Rain {day.rainfallMm.toFixed(1)} mm
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <RiskCallout title="Actionable guidance" tone="info">
            Review the weather summary before irrigation, spraying, or harvest
            movement. Local accuracy depends on the source shown above.
          </RiskCallout>

          <div className="space-y-3">
            {weather.advisories.map((advisory) => (
              <div
                key={advisory}
                className="surface-card rounded-[var(--radius-card)] p-4 text-sm leading-6 text-[var(--foreground-soft)]"
              >
                {advisory}
              </div>
            ))}
          </div>

          {speech.isSupported ? (
            <Button
              type="button"
              variant="secondary"
              block
              leadingIcon={
                speech.isSpeaking ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )
              }
              onClick={() =>
                speech.isSpeaking ? speech.stop() : speech.speak(narration)
              }
            >
              {speech.isSpeaking ? "Stop audio" : "Read weather aloud"}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
