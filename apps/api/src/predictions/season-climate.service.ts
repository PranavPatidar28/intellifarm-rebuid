import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  WEATHER_PROVIDER,
  type WeatherProvider,
} from '../weather/weather.provider';

type SeasonKey = 'KHARIF' | 'RABI' | 'ZAID' | 'CUSTOM';

type SeasonClimateRequest = {
  state: string;
  district?: string | null;
  village?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationOverride?: {
    latitude: number;
    longitude: number;
  };
  seasonProfile: {
    seasonKey: SeasonKey;
    sowingMonth: number;
  };
};

type HistoricalArchivePayload = {
  hourly?: {
    temperature_2m?: Array<number | null>;
    relative_humidity_2m?: Array<number | null>;
    precipitation?: Array<number | null>;
  };
  daily?: {
    temperature_2m_max?: Array<number | null>;
    temperature_2m_min?: Array<number | null>;
    precipitation_sum?: Array<number | null>;
  };
};

type HistoricalClimateSample = {
  averageTempC: number;
  minTempC: number;
  maxTempC: number;
  averageHumidityPercent: number;
  totalRainfallMm: number;
};

export type SeasonClimateResult = {
  method: 'HISTORICAL_SEASONAL' | 'CURRENT_FALLBACK';
  averageTempC: number;
  minTempC: number;
  maxTempC: number;
  averageHumidityPercent: number;
  totalRainfallMm: number;
  label: string;
  locationLabel: string;
  assumptions: string[];
};

// ─── Season month ranges ──────────────────────────────────────────────────────

/** Returns the 1-indexed months covered by a season. */
export function getSeasonMonthRange(seasonKey: SeasonKey): number[] {
  switch (seasonKey) {
    case 'KHARIF':
      return [6, 7, 8, 9, 10]; // Jun–Oct
    case 'RABI':
      return [11, 12, 1, 2, 3]; // Nov–Mar
    case 'ZAID':
      return [3, 4, 5, 6]; // Mar–Jun
    case 'CUSTOM':
    default:
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // whole year
  }
}

function seasonMonthRangeLabel(months: number[]): string {
  if (!months.length) return '';
  const first = monthLabel(months[0]);
  const last = monthLabel(months[months.length - 1]);
  return first === last ? first : `${first}–${last}`;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SeasonClimateService {
  private readonly logger = new Logger(SeasonClimateService.name);
  private readonly cache = new Map<
    string,
    {
      expiresAt: number;
      value: SeasonClimateResult;
    }
  >();

  constructor(
    private readonly configService: ConfigService,
    @Inject(WEATHER_PROVIDER)
    private readonly weatherProvider: WeatherProvider,
  ) {}

  async getSeasonClimate(
    input: SeasonClimateRequest,
  ): Promise<SeasonClimateResult> {
    const resolvedLocation = resolvePredictionLocation(input);
    const seasonMonths = getSeasonMonthRange(input.seasonProfile.seasonKey);
    const cacheKey = `${resolvedLocation.latitude.toFixed(2)}:${resolvedLocation.longitude.toFixed(2)}:${input.seasonProfile.seasonKey}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    try {
      const historicalClimate = await this.fetchSeasonHistoricalClimate(
        resolvedLocation.latitude,
        resolvedLocation.longitude,
        seasonMonths,
      );
      const rangeLabel = seasonMonthRangeLabel(seasonMonths);
      const result: SeasonClimateResult = {
        method: 'HISTORICAL_SEASONAL',
        ...historicalClimate,
        label: `5-year ${formatSeasonKey(input.seasonProfile.seasonKey)} averages (${rangeLabel}) near ${resolvedLocation.locationLabel}`,
        locationLabel: resolvedLocation.locationLabel,
        assumptions: [
          resolvedLocation.assumption,
          `Weather data uses 5-year historical averages across the full ${formatSeasonKey(input.seasonProfile.seasonKey)} season (${rangeLabel}).`,
        ],
      };

      this.cache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        value: result,
      });

      return result;
    } catch (error) {
      this.logger.warn(
        `Historical season climate unavailable, falling back to current forecast: ${error instanceof Error ? error.message : String(error)}`,
      );

      const forecast = await this.weatherProvider.getForecast({
        latitude: resolvedLocation.latitude,
        longitude: resolvedLocation.longitude,
      });

      // Derive min/max from the 5-day forecast daily data
      const dailyMaxTemps = forecast.daily.map((d) => d.maxTemperatureC);
      const dailyMinTemps = forecast.daily.map((d) => d.minTemperatureC);

      const fallback: SeasonClimateResult = {
        method: 'CURRENT_FALLBACK',
        averageTempC: roundMetric(forecast.current.temperatureC),
        minTempC: roundMetric(
          dailyMinTemps.length
            ? Math.min(...dailyMinTemps)
            : forecast.current.temperatureC - 6,
        ),
        maxTempC: roundMetric(
          dailyMaxTemps.length
            ? Math.max(...dailyMaxTemps)
            : forecast.current.temperatureC + 6,
        ),
        averageHumidityPercent: roundMetric(forecast.current.humidityPercent),
        totalRainfallMm: roundMetric(forecast.current.rainfallExpectedMm),
        label: `Current weather fallback near ${resolvedLocation.locationLabel}`,
        locationLabel: resolvedLocation.locationLabel,
        assumptions: [
          resolvedLocation.assumption,
          `Historical climate was unavailable; using a short-range forecast as an approximation.`,
        ],
      };

      this.cache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        value: fallback,
      });

      return fallback;
    }
  }

  /**
   * Fetches historical climate data across ALL months in the season window,
   * averaged over the last 5 completed years.
   *
   * For each year, we fetch every month in the season range and aggregate
   * into a single sample (avg temp, min temp, max temp, humidity, rainfall).
   * Then we average across the 5 years.
   */
  private async fetchSeasonHistoricalClimate(
    latitude: number,
    longitude: number,
    seasonMonths: number[],
  ) {
    const baseUrl = this.configService.get<string>(
      'OPEN_METEO_HISTORICAL_BASE_URL',
      'https://archive-api.open-meteo.com/v1/archive',
    );
    const lastCompletedYear = new Date().getFullYear() - 1;
    const years = Array.from(
      { length: 5 },
      (_, index) => lastCompletedYear - 4 + index,
    );

    const yearSamples = await Promise.all(
      years.map(async (year) => {
        // Fetch all months in the season window for this year
        const monthSamples = await Promise.all(
          seasonMonths.map(async (month) => {
            // Handle cross-year seasons (e.g., Rabi: Nov-Dec of year, Jan-Mar of year+1)
            const effectiveYear =
              seasonMonths[0] > 6 && month <= 3 ? year + 1 : year;
            const firstDay = new Date(Date.UTC(effectiveYear, month - 1, 1));
            const lastDay = new Date(Date.UTC(effectiveYear, month, 0));

            // Don't fetch future dates
            if (firstDay > new Date()) {
              return null;
            }

            const query = new URLSearchParams({
              latitude: latitude.toString(),
              longitude: longitude.toString(),
              start_date: firstDay.toISOString().slice(0, 10),
              end_date: lastDay.toISOString().slice(0, 10),
              hourly: 'temperature_2m,relative_humidity_2m,precipitation',
              daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
              timezone: 'auto',
            });

            const response = await fetch(`${baseUrl}?${query.toString()}`);

            if (!response.ok) {
              this.logger.warn(
                `Historical fetch failed for ${effectiveYear}-${month}: ${response.status}`,
              );
              return null;
            }

            return (await response.json()) as HistoricalArchivePayload;
          }),
        );

        // Merge all month payloads for this year into one sample
        const validPayloads = monthSamples.filter(
          (p): p is HistoricalArchivePayload => p !== null,
        );

        if (!validPayloads.length) return null;

        return mergeMonthPayloadsIntoSample(validPayloads);
      }),
    );

    const validSamples = yearSamples.filter(
      (s): s is HistoricalClimateSample => s !== null,
    );

    if (!validSamples.length) {
      throw new Error('No historical climate data available for this season');
    }

    return aggregateSeasonSamples(validSamples);
  }
}

// ─── Aggregation helpers ──────────────────────────────────────────────────────

/**
 * Merges multiple monthly archive payloads into a single season-wide sample.
 */
function mergeMonthPayloadsIntoSample(
  payloads: HistoricalArchivePayload[],
): HistoricalClimateSample {
  const allHourlyTemps: number[] = [];
  const allHourlyHumidity: number[] = [];
  let totalRainfallMm = 0;
  const allDailyMin: number[] = [];
  const allDailyMax: number[] = [];

  for (const payload of payloads) {
    // Hourly data for avg temp and humidity
    for (const t of payload.hourly?.temperature_2m ?? []) {
      if (typeof t === 'number' && Number.isFinite(t)) allHourlyTemps.push(t);
    }
    for (const h of payload.hourly?.relative_humidity_2m ?? []) {
      if (typeof h === 'number' && Number.isFinite(h))
        allHourlyHumidity.push(h);
    }
    for (const r of payload.hourly?.precipitation ?? []) {
      if (typeof r === 'number' && Number.isFinite(r)) totalRainfallMm += r;
    }

    // Daily data for min/max temps
    for (const mn of payload.daily?.temperature_2m_min ?? []) {
      if (typeof mn === 'number' && Number.isFinite(mn)) allDailyMin.push(mn);
    }
    for (const mx of payload.daily?.temperature_2m_max ?? []) {
      if (typeof mx === 'number' && Number.isFinite(mx)) allDailyMax.push(mx);
    }
  }

  if (!allHourlyTemps.length || !allHourlyHumidity.length) {
    throw new Error('Incomplete historical season climate data');
  }

  const avgTemp =
    allHourlyTemps.reduce((s, v) => s + v, 0) / allHourlyTemps.length;
  const avgHumidity =
    allHourlyHumidity.reduce((s, v) => s + v, 0) / allHourlyHumidity.length;

  return {
    averageTempC: avgTemp,
    minTempC: allDailyMin.length ? Math.min(...allDailyMin) : avgTemp - 8,
    maxTempC: allDailyMax.length ? Math.max(...allDailyMax) : avgTemp + 8,
    averageHumidityPercent: avgHumidity,
    totalRainfallMm,
  };
}

/**
 * Averages multiple yearly season samples into a single result.
 */
function aggregateSeasonSamples(samples: HistoricalClimateSample[]) {
  const n = samples.length;
  const averageTempC = samples.reduce((s, v) => s + v.averageTempC, 0) / n;
  const minTempC = Math.min(...samples.map((s) => s.minTempC));
  const maxTempC = Math.max(...samples.map((s) => s.maxTempC));
  const averageHumidityPercent =
    samples.reduce((s, v) => s + v.averageHumidityPercent, 0) / n;
  const totalRainfallMm =
    samples.reduce((s, v) => s + v.totalRainfallMm, 0) / n;

  return {
    averageTempC: roundMetric(averageTempC),
    minTempC: roundMetric(minTempC),
    maxTempC: roundMetric(maxTempC),
    averageHumidityPercent: roundMetric(averageHumidityPercent),
    totalRainfallMm: roundMetric(totalRainfallMm),
  };
}

// ─── Location resolution ──────────────────────────────────────────────────────

function resolvePredictionLocation(input: SeasonClimateRequest) {
  if (input.locationOverride) {
    return {
      latitude: input.locationOverride.latitude,
      longitude: input.locationOverride.longitude,
      locationLabel: 'current GPS location',
      assumption: 'Using the current GPS location for climate matching.',
    };
  }

  if (input.latitude != null && input.longitude != null) {
    return {
      latitude: input.latitude,
      longitude: input.longitude,
      locationLabel:
        input.district && input.state
          ? `${input.district}, ${input.state}`
          : input.state,
      assumption:
        input.district && input.state
          ? `Using saved coordinates near ${input.district}, ${input.state}.`
          : `Using saved coordinates near ${input.state}.`,
    };
  }

  const stateCoordinates = getStateFallbackCoordinates(input.state);

  if (stateCoordinates) {
    return {
      ...stateCoordinates,
      locationLabel: input.state,
      assumption: `Exact coordinates were not available, so the prediction is using approximate ${input.state} climate.`,
    };
  }

  return {
    latitude: 23.5937,
    longitude: 78.9629,
    locationLabel: 'India',
    assumption:
      'Exact coordinates were not available, so the prediction is using a broad India-level climate fallback.',
  };
}

function getStateFallbackCoordinates(state: string) {
  const byState: Record<string, { latitude: number; longitude: number }> = {
    'Madhya Pradesh': { latitude: 23.2599, longitude: 77.4126 },
    Punjab: { latitude: 30.9008, longitude: 75.8573 },
    Haryana: { latitude: 29.0588, longitude: 76.0856 },
    Maharashtra: { latitude: 19.7515, longitude: 75.7139 },
    'Uttar Pradesh': { latitude: 26.8467, longitude: 80.9462 },
    Telangana: { latitude: 17.385, longitude: 78.4867 },
    Rajasthan: { latitude: 27.0238, longitude: 74.2179 },
    Gujarat: { latitude: 22.2587, longitude: 71.1924 },
    Karnataka: { latitude: 15.3173, longitude: 75.7139 },
  };

  return byState[state] ?? null;
}

export function formatSeasonKey(value: SeasonKey) {
  const labels: Record<SeasonKey, string> = {
    KHARIF: 'Kharif',
    RABI: 'Rabi',
    ZAID: 'Zaid',
    CUSTOM: 'Custom season',
  };

  return labels[value];
}

function monthLabel(month: number) {
  return new Date(Date.UTC(2025, month - 1, 1)).toLocaleString('en-US', {
    month: 'short',
    timeZone: 'UTC',
  });
}

function roundMetric(value: number) {
  return Number(value.toFixed(1));
}
