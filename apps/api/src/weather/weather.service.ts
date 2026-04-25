import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { FarmPlot } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  WEATHER_PROVIDER,
  type WeatherForecast,
  type WeatherProvider,
} from './weather.provider';

type LocationOverride = {
  latitude: number;
  longitude: number;
};

type ResolvedWeatherLocation = LocationOverride & {
  locationSource:
    | 'DEVICE_GPS'
    | 'FARM_PLOT'
    | 'STATE_FALLBACK'
    | 'COUNTRY_FALLBACK';
  locationLabel: string;
};

@Injectable()
export class WeatherService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WEATHER_PROVIDER)
    private readonly weatherProvider: WeatherProvider,
  ) {}

  async getPlotWeather(
    userId: string,
    farmPlotId: string,
    locationOverride?: LocationOverride,
  ) {
    const farmPlot = await this.prisma.farmPlot.findFirst({
      where: { id: farmPlotId, userId },
    });

    if (!farmPlot) {
      throw new NotFoundException('Farm plot not found');
    }

    return {
      weather: await this.getWeatherForFarmPlot(farmPlot, locationOverride),
    };
  }

  async getWeatherForFarmPlot(
    farmPlot: FarmPlot,
    locationOverride?: LocationOverride,
  ) {
    const coordinates = this.resolveCoordinates(farmPlot, locationOverride);

    if (coordinates.locationSource !== 'DEVICE_GPS') {
      const cachedSnapshot = await this.prisma.weatherSnapshot.findFirst({
        where: {
          farmPlotId: farmPlot.id,
          createdAt: {
            gte: new Date(Date.now() - 30 * 60 * 1000),
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const cachedWeather = cachedSnapshot
        ? this.parseStoredWeather(cachedSnapshot.rawPayload)
        : null;

      if (cachedWeather) {
        return {
          ...cachedWeather,
          advisories: this.buildGenericAdvisories(
            cachedWeather.currentTemperatureC,
            cachedWeather.rainfallExpectedMm,
          ),
          locationSource: coordinates.locationSource,
          locationLabel: coordinates.locationLabel,
        };
      }
    }

    try {
      const forecast = await this.weatherProvider.getForecast({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });
      const weather = {
        ...forecast,
        advisories: this.buildGenericAdvisories(
          forecast.currentTemperatureC,
          forecast.rainfallExpectedMm,
        ),
        locationSource: coordinates.locationSource,
        locationLabel: coordinates.locationLabel,
      };

      if (coordinates.locationSource !== 'DEVICE_GPS') {
        await this.prisma.weatherSnapshot.create({
          data: {
            farmPlotId: farmPlot.id,
            source: forecast.source,
            forecastDate: new Date(),
            summary: forecast.forecastSummary,
            rawPayload: weather as never,
          },
        });
      }

      return weather;
    } catch {
      const latestSnapshot = await this.prisma.weatherSnapshot.findFirst({
        where: { farmPlotId: farmPlot.id },
        orderBy: { createdAt: 'desc' },
      });

      const cachedWeather = latestSnapshot
        ? this.parseStoredWeather(latestSnapshot.rawPayload)
        : null;

      if (cachedWeather) {
        return {
          ...cachedWeather,
          advisories: ['Using the latest saved weather summary.'],
          source: 'Saved snapshot',
          locationSource: 'SNAPSHOT_FALLBACK' as const,
          locationLabel: coordinates.locationLabel,
        };
      }

      return {
        currentTemperatureC: 30,
        humidityPercent: 68,
        rainfallExpectedMm: 4,
        forecastSummary:
          'Weather service is temporarily unavailable. Showing a safe fallback summary.',
        forecastDays: buildFallbackForecastDays(),
        advisories: [
          'Weather feed unavailable. Review local conditions before spray or irrigation decisions.',
        ],
        source: 'Safe fallback',
        locationSource: 'SAFE_FALLBACK' as const,
        locationLabel: coordinates.locationLabel,
      };
    }
  }

  private parseStoredWeather(rawPayload: unknown): WeatherForecast | null {
    if (!rawPayload || typeof rawPayload !== 'object') {
      return null;
    }

    const payload = rawPayload as Record<string, unknown>;
    if (
      typeof payload.currentTemperatureC === 'number' &&
      typeof payload.rainfallExpectedMm === 'number' &&
      typeof payload.forecastSummary === 'string' &&
      Array.isArray(payload.forecastDays)
    ) {
      return {
        currentTemperatureC: payload.currentTemperatureC,
        humidityPercent:
          typeof payload.humidityPercent === 'number'
            ? payload.humidityPercent
            : estimateHumidityPercent(
                payload.currentTemperatureC,
                payload.rainfallExpectedMm,
              ),
        rainfallExpectedMm: payload.rainfallExpectedMm,
        forecastSummary: payload.forecastSummary,
        forecastDays: payload.forecastDays
          .filter(
            (day): day is Record<string, unknown> =>
              !!day && typeof day === 'object',
          )
          .map((day) => ({
            date:
              typeof day.date === 'string'
                ? day.date
                : new Date().toISOString(),
            maxTemperatureC:
              typeof day.maxTemperatureC === 'number'
                ? day.maxTemperatureC
                : 30,
            minTemperatureC:
              typeof day.minTemperatureC === 'number'
                ? day.minTemperatureC
                : 22,
            rainfallMm: typeof day.rainfallMm === 'number' ? day.rainfallMm : 0,
          })),
        source:
          typeof payload.source === 'string'
            ? payload.source
            : 'Saved snapshot',
      };
    }

    if ('daily' in payload && 'current' in payload) {
      const daily = payload.daily as Record<string, unknown>;
      const current = payload.current as Record<string, unknown>;
      const time = Array.isArray(daily.time) ? daily.time : [];
      const precipitation = Array.isArray(daily.precipitation_sum)
        ? daily.precipitation_sum
        : [];
      const maximums = Array.isArray(daily.temperature_2m_max)
        ? daily.temperature_2m_max
        : [];
      const minimums = Array.isArray(daily.temperature_2m_min)
        ? daily.temperature_2m_min
        : [];
      const forecastDays = time.slice(0, 3).map((date, index) => ({
        date: typeof date === 'string' ? date : new Date().toISOString(),
        maxTemperatureC:
          typeof maximums[index] === 'number' ? maximums[index] : 30,
        minTemperatureC:
          typeof minimums[index] === 'number' ? minimums[index] : 22,
        rainfallMm:
          typeof precipitation[index] === 'number' ? precipitation[index] : 0,
      }));
      const rainfallExpectedMm = forecastDays.reduce(
        (sum, day) => sum + day.rainfallMm,
        0,
      );
      return {
        currentTemperatureC:
          typeof current.temperature_2m === 'number'
            ? current.temperature_2m
            : 30,
        humidityPercent:
          typeof current.relative_humidity_2m === 'number'
            ? current.relative_humidity_2m
            : estimateHumidityPercent(
                typeof current.temperature_2m === 'number'
                  ? current.temperature_2m
                  : 30,
                rainfallExpectedMm,
              ),
        rainfallExpectedMm,
        forecastSummary:
          typeof payload.summary === 'string'
            ? payload.summary
            : `Current ${Math.round(
                typeof current.temperature_2m === 'number'
                  ? current.temperature_2m
                  : 30,
              )}C, next 3 days rain ${rainfallExpectedMm.toFixed(1)} mm.`,
        forecastDays,
        source: 'Saved snapshot',
      };
    }

    return null;
  }

  private buildGenericAdvisories(
    temperature: number,
    rainfallExpectedMm: number,
  ) {
    const advisories: string[] = [];

    if (rainfallExpectedMm >= 20) {
      advisories.push('Rain is likely soon. Pause non-urgent spray plans.');
    }

    if (temperature >= 34 && rainfallExpectedMm < 5) {
      advisories.push('Hot and dry weather may increase water demand.');
    }

    if (advisories.length === 0) {
      advisories.push(
        'No major weather risk is visible in the short forecast.',
      );
    }

    return advisories;
  }

  private resolveCoordinates(
    farmPlot: FarmPlot,
    locationOverride?: LocationOverride,
  ): ResolvedWeatherLocation {
    if (locationOverride) {
      return {
        latitude: locationOverride.latitude,
        longitude: locationOverride.longitude,
        locationSource: 'DEVICE_GPS',
        locationLabel: 'Current GPS location',
      };
    }

    if (farmPlot.latitude != null && farmPlot.longitude != null) {
      return {
        latitude: farmPlot.latitude,
        longitude: farmPlot.longitude,
        locationSource: 'FARM_PLOT',
        locationLabel: `${farmPlot.village}, ${farmPlot.district}`,
      };
    }

    const byState: Record<string, { latitude: number; longitude: number }> = {
      Punjab: { latitude: 30.9008, longitude: 75.8573 },
      Haryana: { latitude: 29.0588, longitude: 76.0856 },
      Maharashtra: { latitude: 19.7515, longitude: 75.7139 },
      'Uttar Pradesh': { latitude: 26.8467, longitude: 80.9462 },
      Telangana: { latitude: 17.385, longitude: 78.4867 },
    };

    const stateCoordinates = byState[farmPlot.state];

    if (stateCoordinates) {
      return {
        ...stateCoordinates,
        locationSource: 'STATE_FALLBACK',
        locationLabel: `Approximate ${farmPlot.state} weather`,
      };
    }

    return {
      latitude: 23.5937,
      longitude: 78.9629,
      locationSource: 'COUNTRY_FALLBACK',
      locationLabel: 'Approximate India weather',
    };
  }
}

function buildFallbackForecastDays() {
  const today = new Date();

  return Array.from({ length: 3 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return {
      date: date.toISOString().slice(0, 10),
      maxTemperatureC: 32,
      minTemperatureC: 23,
      rainfallMm: index === 1 ? 2 : 1,
    };
  });
}

function estimateHumidityPercent(
  temperature: number,
  rainfallExpectedMm: number,
) {
  if (rainfallExpectedMm >= 20) {
    return 84;
  }

  if (rainfallExpectedMm >= 8) {
    return 74;
  }

  if (temperature >= 35) {
    return 46;
  }

  if (temperature >= 30) {
    return 58;
  }

  return 68;
}
