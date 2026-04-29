import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { FarmPlot } from '../generated/prisma';

import { PrismaService } from '../prisma/prisma.service';
import {
  WEATHER_PROVIDER,
  type WeatherConditionCode,
  type WeatherForecast,
  type WeatherProvider,
} from './weather.provider';

type LocationOverride = {
  latitude: number;
  longitude: number;
};

type WeatherLocationSource =
  | 'DEVICE_GPS'
  | 'FARM_PLOT'
  | 'STATE_FALLBACK'
  | 'COUNTRY_FALLBACK'
  | 'SNAPSHOT_FALLBACK'
  | 'SAFE_FALLBACK';

type ResolvedWeatherLocation = LocationOverride & {
  locationSource: WeatherLocationSource;
  locationLabel: string;
};

type WeatherRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
type FieldWindowStatus = 'GOOD' | 'CAUTION' | 'AVOID';
type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type WeatherSummary = {
  current: WeatherForecast['current'];
  hourly: WeatherForecast['hourly'];
  daily: WeatherForecast['daily'];
  advisories: Array<{
    title: string;
    message: string;
    severity: Severity;
    recommendedAction: string;
    audioSummary: string;
  }>;
  riskSignals: {
    sprayRisk: { level: WeatherRiskLevel; reason: string };
    irrigationNeed: { level: WeatherRiskLevel; reason: string };
    heatStressRisk: { level: WeatherRiskLevel; reason: string };
    floodRisk: { level: WeatherRiskLevel; reason: string };
  };
  fieldWindows: {
    sprayWindow: { status: FieldWindowStatus; summary: string };
    irrigationWindow: { status: FieldWindowStatus; summary: string };
    harvestWindow: { status: FieldWindowStatus; summary: string };
  };
  sourceMeta: {
    provider: string;
    locationSource: WeatherLocationSource;
    locationLabel: string;
    accuracyLabel: string;
    isFallback: boolean;
  };
  freshness: {
    capturedAt: string;
    isCached: boolean;
    cacheAgeMinutes: number;
    stale: boolean;
  };
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

      if (cachedSnapshot) {
        const cachedWeather = this.parseStoredWeather({
          rawPayload: cachedSnapshot.rawPayload,
          coordinates,
          capturedAt: cachedSnapshot.createdAt,
          forceCached: true,
        });

        if (cachedWeather) {
          return cachedWeather;
        }
      }
    }

    try {
      const forecast = await this.weatherProvider.getForecast({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });
      const weather = this.composeWeatherSummary({
        forecast,
        coordinates,
        capturedAt: forecast.current.updatedAt,
        isCached: false,
        providerOverride: forecast.provider,
      });

      if (coordinates.locationSource !== 'DEVICE_GPS') {
        await this.prisma.weatherSnapshot.create({
          data: {
            farmPlotId: farmPlot.id,
            source: forecast.provider,
            forecastDate: new Date(forecast.current.updatedAt),
            summary: weather.advisories[0]?.message ?? weather.current.conditionLabel,
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

      if (latestSnapshot) {
        const cachedWeather = this.parseStoredWeather({
          rawPayload: latestSnapshot.rawPayload,
          coordinates: {
            ...coordinates,
            locationSource: 'SNAPSHOT_FALLBACK',
          },
          capturedAt: latestSnapshot.createdAt,
          forceCached: true,
          providerOverride: 'Saved snapshot',
        });

        if (cachedWeather) {
          return {
            ...cachedWeather,
            advisories: [
              {
                title: 'Using saved weather',
                message:
                  'The live feed is unavailable, so IntelliFarm is showing the latest saved field weather.',
                severity: 'MEDIUM',
                recommendedAction:
                  'Use this as a guide and confirm local rain or wind before spray decisions.',
                audioSummary:
                  'Live weather is unavailable. Using the latest saved weather for guidance.',
              },
              ...cachedWeather.advisories,
            ].slice(0, 3),
          };
        }
      }

      const fallbackForecast = buildFallbackForecast();
      return this.composeWeatherSummary({
        forecast: fallbackForecast,
        coordinates: {
          ...coordinates,
          locationSource: 'SAFE_FALLBACK',
        },
        capturedAt: new Date().toISOString(),
        isCached: true,
        providerOverride: 'Safe fallback',
      });
    }
  }

  private parseStoredWeather(params: {
    rawPayload: unknown;
    coordinates: ResolvedWeatherLocation;
    capturedAt: Date;
    forceCached: boolean;
    providerOverride?: string;
  }): WeatherSummary | null {
    const { rawPayload, coordinates, capturedAt, forceCached, providerOverride } =
      params;

    if (!rawPayload || typeof rawPayload !== 'object') {
      return null;
    }

    const payload = rawPayload as Record<string, unknown>;

    if (
      'current' in payload &&
      'daily' in payload &&
      'hourly' in payload &&
      'riskSignals' in payload &&
      'fieldWindows' in payload
    ) {
      const summary = payload as unknown as WeatherSummary;
      return {
        ...summary,
        sourceMeta: {
          provider: providerOverride ?? summary.sourceMeta.provider,
          locationSource: coordinates.locationSource,
          locationLabel: coordinates.locationLabel,
          accuracyLabel: describeAccuracyLabel(coordinates.locationSource),
          isFallback: isFallbackSource(coordinates.locationSource),
        },
        freshness: buildFreshness({
          capturedAt,
          isCached: forceCached || summary.freshness.isCached,
        }),
      };
    }

    const legacy = parseLegacyWeatherPayload(payload);
    if (!legacy) {
      return null;
    }

    return this.composeWeatherSummary({
      forecast: legacy,
      coordinates,
      capturedAt: capturedAt.toISOString(),
      isCached: forceCached,
      providerOverride: providerOverride ?? legacy.provider,
    });
  }

  private composeWeatherSummary(params: {
    forecast: WeatherForecast;
    coordinates: ResolvedWeatherLocation;
    capturedAt: string;
    isCached: boolean;
    providerOverride?: string;
  }): WeatherSummary {
    const { forecast, coordinates, capturedAt, isCached, providerOverride } =
      params;
    const riskSignals = buildRiskSignals(forecast);
    const fieldWindows = buildFieldWindows(forecast, riskSignals);
    const advisories = buildWeatherAdvisories(forecast, riskSignals, fieldWindows);

    return {
      current: forecast.current,
      hourly: forecast.hourly,
      daily: forecast.daily,
      advisories,
      riskSignals,
      fieldWindows,
      sourceMeta: {
        provider: providerOverride ?? forecast.provider,
        locationSource: coordinates.locationSource,
        locationLabel: coordinates.locationLabel,
        accuracyLabel: describeAccuracyLabel(coordinates.locationSource),
        isFallback: isFallbackSource(coordinates.locationSource),
      },
      freshness: buildFreshness({
        capturedAt: new Date(capturedAt),
        isCached,
      }),
    };
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
      Gujarat: { latitude: 22.2587, longitude: 71.1924 },
      'Madhya Pradesh': { latitude: 23.5937, longitude: 78.9629 },
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

function parseLegacyWeatherPayload(payload: Record<string, unknown>): WeatherForecast | null {
  if (
    typeof payload.currentTemperatureC === 'number' &&
    typeof payload.rainfallExpectedMm === 'number' &&
    Array.isArray(payload.forecastDays)
  ) {
    const condition = deriveConditionFromLegacy(
      payload.currentTemperatureC,
      payload.rainfallExpectedMm,
    );
    const daily = payload.forecastDays
      .filter(
        (day): day is Record<string, unknown> => !!day && typeof day === 'object',
      )
      .map((day) => {
        const rainfallMm = typeof day.rainfallMm === 'number' ? day.rainfallMm : 0;
        const dayCondition = deriveConditionFromLegacy(
          typeof day.maxTemperatureC === 'number' ? day.maxTemperatureC : 30,
          rainfallMm,
        );

        return {
          date:
            typeof day.date === 'string' ? day.date : new Date().toISOString().slice(0, 10),
          maxTemperatureC:
            typeof day.maxTemperatureC === 'number' ? day.maxTemperatureC : 30,
          minTemperatureC:
            typeof day.minTemperatureC === 'number' ? day.minTemperatureC : 22,
          rainfallMm,
          conditionCode: dayCondition.code,
          conditionLabel: dayCondition.label,
        };
      });

    return {
      current: {
        temperatureC: payload.currentTemperatureC,
        humidityPercent:
          typeof payload.humidityPercent === 'number'
            ? payload.humidityPercent
            : estimateHumidityPercent(
                payload.currentTemperatureC,
                payload.rainfallExpectedMm,
              ),
        rainfallExpectedMm: payload.rainfallExpectedMm,
        rainProbabilityPercent:
          payload.rainfallExpectedMm >= 18
            ? 82
            : payload.rainfallExpectedMm >= 6
              ? 58
              : 22,
        conditionCode: condition.code,
        conditionLabel: condition.label,
        feelsLikeC: payload.currentTemperatureC,
        windSpeedKph: 12,
        updatedAt: new Date().toISOString(),
      },
      hourly: buildFallbackHourlyForecast({
        temperatureC: payload.currentTemperatureC,
        rainfallExpectedMm: payload.rainfallExpectedMm,
      }),
      daily,
      provider: typeof payload.source === 'string' ? payload.source : 'Saved snapshot',
    };
  }

  return null;
}

function buildRiskSignals(forecast: WeatherForecast) {
  const rainfallWindow = forecast.current.rainfallExpectedMm;
  const rainProbability = forecast.current.rainProbabilityPercent;
  const temperature = forecast.current.temperatureC;
  const humidity = forecast.current.humidityPercent;
  const drySignal = rainfallWindow < 4 && temperature >= 32;
  const heavyRainSignal = rainfallWindow >= 18 || rainProbability >= 75;

  return {
    sprayRisk: {
      level:
        heavyRainSignal || forecast.current.windSpeedKph >= 24
          ? 'HIGH'
          : rainProbability >= 45
            ? 'MEDIUM'
            : 'LOW',
      reason: heavyRainSignal
        ? 'Rain or strong wind may wash off spray coverage.'
        : rainProbability >= 45
          ? 'Cloudy and damp weather may shorten the safe spray window.'
          : 'Low rain risk keeps spray timing more flexible today.',
    },
    irrigationNeed: {
      level: drySignal ? 'HIGH' : rainfallWindow >= 10 ? 'LOW' : 'MEDIUM',
      reason: drySignal
        ? 'Hot weather with little expected rain may increase field water demand.'
        : rainfallWindow >= 10
          ? 'Incoming rain may cover part of this irrigation cycle.'
          : 'Review soil moisture before the next irrigation turn.',
    },
    heatStressRisk: {
      level:
        temperature >= 37 ? 'HIGH' : temperature >= 33 || humidity <= 35 ? 'MEDIUM' : 'LOW',
      reason:
        temperature >= 37
          ? 'High daytime heat can stress the crop canopy quickly.'
          : temperature >= 33 || humidity <= 35
            ? 'Warm and drying conditions call for closer field watching.'
            : 'No major heat stress signal is visible right now.',
    },
    floodRisk: {
      level:
        rainfallWindow >= 28
          ? 'HIGH'
          : rainfallWindow >= 14 || humidity >= 82
            ? 'MEDIUM'
            : 'LOW',
      reason:
        rainfallWindow >= 28
          ? 'Heavy rain may cause standing water in low fields.'
          : rainfallWindow >= 14 || humidity >= 82
            ? 'Moist conditions can slow field drying and movement.'
            : 'Short-range flood risk looks limited.',
    },
  } as const;
}

function buildFieldWindows(
  forecast: WeatherForecast,
  riskSignals: ReturnType<typeof buildRiskSignals>,
) {
  const sprayWindow =
    riskSignals.sprayRisk.level === 'HIGH'
      ? {
          status: 'AVOID' as const,
          summary: 'Avoid spray for now until rain and wind settle.',
        }
      : riskSignals.sprayRisk.level === 'MEDIUM'
        ? {
            status: 'CAUTION' as const,
            summary: 'Spray only if needed and watch the next rain spell closely.',
          }
        : {
            status: 'GOOD' as const,
            summary: 'The current spray window looks workable for short field tasks.',
          };

  const irrigationWindow =
    riskSignals.irrigationNeed.level === 'HIGH'
      ? {
          status: 'GOOD' as const,
          summary: 'Plan a moisture check and be ready for irrigation if soil is dry.',
        }
      : forecast.current.rainfallExpectedMm >= 10
        ? {
            status: 'AVOID' as const,
            summary: 'Expected rain reduces the need for immediate irrigation.',
          }
        : {
            status: 'CAUTION' as const,
            summary: 'Check root-zone moisture before applying another irrigation turn.',
          };

  const harvestWindow =
    riskSignals.floodRisk.level === 'HIGH'
      ? {
          status: 'AVOID' as const,
          summary: 'Wet field conditions may delay harvest movement and transport.',
        }
      : forecast.current.humidityPercent >= 80
        ? {
            status: 'CAUTION' as const,
            summary: 'High humidity may slow crop drying and handling.',
          }
        : {
            status: 'GOOD' as const,
            summary: 'Field movement conditions look reasonably steady right now.',
          };

  return {
    sprayWindow,
    irrigationWindow,
    harvestWindow,
  };
}

function buildWeatherAdvisories(
  forecast: WeatherForecast,
  riskSignals: ReturnType<typeof buildRiskSignals>,
  fieldWindows: ReturnType<typeof buildFieldWindows>,
) {
  const advisories: WeatherSummary['advisories'] = [];

  if (riskSignals.sprayRisk.level === 'HIGH') {
    advisories.push({
      title: 'Hold spray plans',
      message:
        'Rain or wind risk is high in the short forecast. A spray done now may not stay effective.',
      severity: 'HIGH',
      recommendedAction:
        'Delay non-urgent spray work and review the next clear window before mixing inputs.',
      audioSummary:
        'Rain or wind risk is high. Hold spray plans for now.',
    });
  }

  if (riskSignals.irrigationNeed.level === 'HIGH') {
    advisories.push({
      title: 'Watch soil moisture closely',
      message:
        'Hot and drier conditions may pull moisture faster from the field over the next day.',
      severity: 'MEDIUM',
      recommendedAction:
        'Inspect moisture near the root zone and prepare the next irrigation turn if the soil is drying.',
      audioSummary:
        'Hot and dry weather may increase water demand. Check soil moisture.',
    });
  }

  if (riskSignals.floodRisk.level === 'HIGH') {
    advisories.push({
      title: 'Protect low-lying areas',
      message:
        'Heavy rain may collect in lower spots and disturb access to the field.',
      severity: 'HIGH',
      recommendedAction:
        'Check drainage, secure loose inputs, and avoid heavy movement in waterlogged areas.',
      audioSummary:
        'Heavy rain may affect low fields. Check drainage and field access.',
    });
  }

  if (advisories.length === 0) {
    advisories.push({
      title: 'Use the stable field window',
      message:
        'No major short-range weather shock is visible. This is a good time for routine field work and scouting.',
      severity: 'LOW',
      recommendedAction: fieldWindows.sprayWindow.summary,
      audioSummary:
        'Weather looks fairly steady. Continue routine field work and scouting.',
    });
  }

  return advisories.slice(0, 3);
}

function buildFreshness(params: { capturedAt: Date; isCached: boolean }) {
  const cacheAgeMinutes = Math.max(
    0,
    Math.round((Date.now() - params.capturedAt.getTime()) / 60000),
  );

  return {
    capturedAt: params.capturedAt.toISOString(),
    isCached: params.isCached,
    cacheAgeMinutes,
    stale: cacheAgeMinutes >= 90,
  };
}

function describeAccuracyLabel(locationSource: WeatherLocationSource) {
  switch (locationSource) {
    case 'DEVICE_GPS':
      return 'Live device location';
    case 'FARM_PLOT':
      return 'Saved farm plot location';
    case 'STATE_FALLBACK':
      return 'State-level estimate';
    case 'COUNTRY_FALLBACK':
      return 'Country-level estimate';
    case 'SNAPSHOT_FALLBACK':
      return 'Saved field snapshot';
    case 'SAFE_FALLBACK':
      return 'Safe fallback estimate';
    default:
      return 'Approximate field estimate';
  }
}

function isFallbackSource(locationSource: WeatherLocationSource) {
  return !['DEVICE_GPS', 'FARM_PLOT'].includes(locationSource);
}

function buildFallbackForecast(): WeatherForecast {
  const currentTemperatureC = 31;
  const rainfallExpectedMm = 6;
  const condition = deriveConditionFromLegacy(currentTemperatureC, rainfallExpectedMm);

  return {
    current: {
      temperatureC: currentTemperatureC,
      humidityPercent: 68,
      rainfallExpectedMm,
      rainProbabilityPercent: 48,
      conditionCode: condition.code,
      conditionLabel: condition.label,
      feelsLikeC: 33,
      windSpeedKph: 14,
      updatedAt: new Date().toISOString(),
    },
    hourly: buildFallbackHourlyForecast({
      temperatureC: currentTemperatureC,
      rainfallExpectedMm,
    }),
    daily: buildFallbackDailyForecast(),
    provider: 'Safe fallback',
  };
}

function buildFallbackHourlyForecast(params: {
  temperatureC: number;
  rainfallExpectedMm: number;
}) {
  const base = new Date();
  const rainProbabilityPercent =
    params.rainfallExpectedMm >= 12 ? 78 : params.rainfallExpectedMm >= 5 ? 52 : 20;
  const condition = deriveConditionFromLegacy(
    params.temperatureC,
    params.rainfallExpectedMm,
  );

  return Array.from({ length: 8 }, (_, index) => ({
    time: new Date(base.getTime() + index * 3_600_000).toISOString(),
    temperatureC: params.temperatureC + (index % 3 === 0 ? 1 : 0),
    rainMm:
      params.rainfallExpectedMm >= 12 ? 2.4 : params.rainfallExpectedMm >= 5 ? 1.1 : 0.1,
    rainProbabilityPercent,
    conditionCode: condition.code,
    conditionLabel: condition.label,
  }));
}

function buildFallbackDailyForecast() {
  const today = new Date();

  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const rainfallMm = index === 1 ? 7 : index === 2 ? 3 : 1;
    const condition = deriveConditionFromLegacy(32 - index * 0.5, rainfallMm);

    return {
      date: date.toISOString().slice(0, 10),
      maxTemperatureC: 32 - index * 0.5,
      minTemperatureC: 23 - Math.min(index, 2) * 0.4,
      rainfallMm,
      conditionCode: condition.code,
      conditionLabel: condition.label,
    };
  });
}

function deriveConditionFromLegacy(
  temperature: number,
  rainfallExpectedMm: number,
): { code: WeatherConditionCode; label: string } {
  if (temperature >= 36 && rainfallExpectedMm < 4) {
    return { code: 'HEAT', label: 'Heat stress' };
  }

  if (rainfallExpectedMm >= 20) {
    return { code: 'HEAVY_RAIN', label: 'Heavy rain risk' };
  }

  if (rainfallExpectedMm >= 8) {
    return { code: 'RAIN', label: 'Rain likely' };
  }

  if (rainfallExpectedMm >= 2) {
    return { code: 'LIGHT_RAIN', label: 'Light rain' };
  }

  if (temperature >= 34) {
    return { code: 'PARTLY_CLOUDY', label: 'Warm and partly cloudy' };
  }

  return { code: 'CLEAR', label: 'Clear sky' };
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
