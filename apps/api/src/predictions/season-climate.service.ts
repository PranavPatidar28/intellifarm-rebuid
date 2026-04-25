import { Inject, Injectable } from '@nestjs/common';
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
};

type HistoricalClimateSample = {
  averageTempC: number;
  averageHumidityPercent: number;
  totalRainfallMm: number;
};

type SeasonClimateResult = {
  method: 'HISTORICAL_MONTHLY' | 'CURRENT_FALLBACK';
  averageTempC: number;
  averageHumidityPercent: number;
  totalRainfallMm: number;
  label: string;
  locationLabel: string;
  assumptions: string[];
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SeasonClimateService {
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
    const cacheKey = `${resolvedLocation.latitude.toFixed(2)}:${resolvedLocation.longitude.toFixed(2)}:${input.seasonProfile.sowingMonth}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    try {
      const historicalClimate = await this.fetchHistoricalClimate(
        resolvedLocation.latitude,
        resolvedLocation.longitude,
        input.seasonProfile.sowingMonth,
      );
      const result: SeasonClimateResult = {
        method: 'HISTORICAL_MONTHLY',
        ...historicalClimate,
        label: `Typical ${monthLabel(input.seasonProfile.sowingMonth)} conditions for ${formatSeasonKey(input.seasonProfile.seasonKey)} near ${resolvedLocation.locationLabel}`,
        locationLabel: resolvedLocation.locationLabel,
        assumptions: [resolvedLocation.assumption],
      };

      this.cache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        value: result,
      });

      return result;
    } catch {
      const forecast = await this.weatherProvider.getForecast({
        latitude: resolvedLocation.latitude,
        longitude: resolvedLocation.longitude,
      });
      const fallback: SeasonClimateResult = {
        method: 'CURRENT_FALLBACK',
        averageTempC: roundMetric(forecast.currentTemperatureC),
        averageHumidityPercent: roundMetric(forecast.humidityPercent),
        totalRainfallMm: roundMetric(forecast.rainfallExpectedMm),
        label: `Current weather fallback near ${resolvedLocation.locationLabel}`,
        locationLabel: resolvedLocation.locationLabel,
        assumptions: [
          resolvedLocation.assumption,
          `Historical climate was unavailable, so the system used the current short forecast instead of a typical ${monthLabel(input.seasonProfile.sowingMonth)} pattern.`,
        ],
      };

      this.cache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        value: fallback,
      });

      return fallback;
    }
  }

  private async fetchHistoricalClimate(
    latitude: number,
    longitude: number,
    sowingMonth: number,
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
    const samples = await Promise.all(
      years.map(async (year) => {
        const firstDay = new Date(Date.UTC(year, sowingMonth - 1, 1));
        const lastDay = new Date(Date.UTC(year, sowingMonth, 0));
        const query = new URLSearchParams({
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          start_date: firstDay.toISOString().slice(0, 10),
          end_date: lastDay.toISOString().slice(0, 10),
          hourly: 'temperature_2m,relative_humidity_2m,precipitation',
          timezone: 'auto',
        });

        const response = await fetch(`${baseUrl}?${query.toString()}`);

        if (!response.ok) {
          throw new Error(
            `Historical weather provider failed with ${response.status}`,
          );
        }

        return normalizeHistoricalClimateSample(
          (await response.json()) as HistoricalArchivePayload,
        );
      }),
    );

    return aggregateHistoricalClimateSamples(samples);
  }
}

export function aggregateHistoricalClimateSamples(
  samples: HistoricalClimateSample[],
) {
  if (!samples.length) {
    throw new Error('No historical climate samples available');
  }

  const averageTempC =
    samples.reduce((sum, sample) => sum + sample.averageTempC, 0) /
    samples.length;
  const averageHumidityPercent =
    samples.reduce((sum, sample) => sum + sample.averageHumidityPercent, 0) /
    samples.length;
  const totalRainfallMm =
    samples.reduce((sum, sample) => sum + sample.totalRainfallMm, 0) /
    samples.length;

  return {
    averageTempC: roundMetric(averageTempC),
    averageHumidityPercent: roundMetric(averageHumidityPercent),
    totalRainfallMm: roundMetric(totalRainfallMm),
  };
}

function normalizeHistoricalClimateSample(payload: HistoricalArchivePayload) {
  const temperatures = (payload.hourly?.temperature_2m ?? []).filter(
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value),
  );
  const humidity = (payload.hourly?.relative_humidity_2m ?? []).filter(
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value),
  );
  const rainfall = (payload.hourly?.precipitation ?? []).filter(
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value),
  );

  if (!temperatures.length || !humidity.length) {
    throw new Error('Incomplete historical climate sample');
  }

  return {
    averageTempC:
      temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length,
    averageHumidityPercent:
      humidity.reduce((sum, value) => sum + value, 0) / humidity.length,
    totalRainfallMm: rainfall.reduce((sum, value) => sum + value, 0),
  };
}

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
    Punjab: { latitude: 30.9008, longitude: 75.8573 },
    Haryana: { latitude: 29.0588, longitude: 76.0856 },
    Maharashtra: { latitude: 19.7515, longitude: 75.7139 },
    'Uttar Pradesh': { latitude: 26.8467, longitude: 80.9462 },
    Telangana: { latitude: 17.385, longitude: 78.4867 },
  };

  return byState[state] ?? null;
}

function formatSeasonKey(value: SeasonKey) {
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
    month: 'long',
    timeZone: 'UTC',
  });
}

function roundMetric(value: number) {
  return Number(value.toFixed(1));
}
