import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type WeatherConditionCode =
  | 'CLEAR'
  | 'PARTLY_CLOUDY'
  | 'CLOUDY'
  | 'FOG'
  | 'LIGHT_RAIN'
  | 'RAIN'
  | 'HEAVY_RAIN'
  | 'STORM'
  | 'HEAT'
  | 'UNKNOWN';

export type WeatherForecast = {
  current: {
    temperatureC: number;
    humidityPercent: number;
    rainfallExpectedMm: number;
    rainProbabilityPercent: number;
    conditionCode: WeatherConditionCode;
    conditionLabel: string;
    feelsLikeC: number;
    windSpeedKph: number;
    updatedAt: string;
  };
  hourly: Array<{
    time: string;
    temperatureC: number;
    rainMm: number;
    rainProbabilityPercent: number;
    conditionCode: WeatherConditionCode;
    conditionLabel: string;
  }>;
  daily: Array<{
    date: string;
    maxTemperatureC: number;
    minTemperatureC: number;
    rainfallMm: number;
    conditionCode: WeatherConditionCode;
    conditionLabel: string;
  }>;
  provider: string;
};

export interface WeatherProvider {
  getForecast(location: {
    latitude: number;
    longitude: number;
  }): Promise<WeatherForecast>;
}

export const WEATHER_PROVIDER = Symbol('WEATHER_PROVIDER');

type WeatherPayload = {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m?: number;
    apparent_temperature?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    precipitation_probability: number[];
    weather_code: number[];
  };
  daily: {
    time: string[];
    precipitation_sum: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
  };
};

@Injectable()
export class OpenMeteoWeatherProvider implements WeatherProvider {
  constructor(private readonly configService: ConfigService) {}

  async getForecast(location: { latitude: number; longitude: number }) {
    const baseUrl = this.configService.get<string>(
      'OPEN_METEO_BASE_URL',
      'https://api.open-meteo.com/v1/forecast',
    );
    const query = new URLSearchParams({
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      current:
        'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
      hourly:
        'temperature_2m,precipitation,precipitation_probability,weather_code',
      daily:
        'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code',
      forecast_days: '5',
      timezone: 'auto',
    });
    const response = await fetch(`${baseUrl}?${query.toString()}`);

    if (!response.ok) {
      throw new Error(`Weather provider failed with ${response.status}`);
    }

    const payload = (await response.json()) as WeatherPayload;
    const currentIndex = findCurrentIndex(payload.hourly.time, payload.current.time);
    const hourly = payload.hourly.time
      .slice(currentIndex, currentIndex + 8)
      .map((time, index) => {
        const absoluteIndex = currentIndex + index;
        const temperatureC =
          payload.hourly.temperature_2m[absoluteIndex] ??
          payload.current.temperature_2m;
        const rainMm = payload.hourly.precipitation[absoluteIndex] ?? 0;
        const rainProbabilityPercent =
          payload.hourly.precipitation_probability[absoluteIndex] ?? 0;
        const condition = mapConditionCode(
          payload.hourly.weather_code[absoluteIndex],
          temperatureC,
          rainProbabilityPercent,
        );

        return {
          time,
          temperatureC,
          rainMm,
          rainProbabilityPercent,
          conditionCode: condition.code,
          conditionLabel: condition.label,
        };
      });

    const daily = payload.daily.time.map((date, index) => {
      const maxTemperatureC =
        payload.daily.temperature_2m_max[index] ?? payload.current.temperature_2m;
      const minTemperatureC =
        payload.daily.temperature_2m_min[index] ?? payload.current.temperature_2m;
      const rainfallMm = payload.daily.precipitation_sum[index] ?? 0;
      const condition = mapConditionCode(
        payload.daily.weather_code[index],
        maxTemperatureC,
        rainfallMm > 0 ? 75 : 10,
      );

      return {
        date,
        maxTemperatureC,
        minTemperatureC,
        rainfallMm,
        conditionCode: condition.code,
        conditionLabel: condition.label,
      };
    });

    const next24Hours = hourly.slice(0, 6);
    const rainfallExpectedMm =
      next24Hours.reduce((sum, item) => sum + item.rainMm, 0) ||
      daily[0]?.rainfallMm ||
      payload.current.precipitation ||
      0;
    const rainProbabilityPercent = next24Hours.reduce(
      (max, item) => Math.max(max, item.rainProbabilityPercent),
      0,
    );
    const currentCondition = mapConditionCode(
      payload.current.weather_code,
      payload.current.temperature_2m,
      rainProbabilityPercent,
    );

    return {
      current: {
        temperatureC: payload.current.temperature_2m,
        humidityPercent: payload.current.relative_humidity_2m ?? 68,
        rainfallExpectedMm,
        rainProbabilityPercent,
        conditionCode: currentCondition.code,
        conditionLabel: currentCondition.label,
        feelsLikeC:
          payload.current.apparent_temperature ?? payload.current.temperature_2m,
        windSpeedKph: payload.current.wind_speed_10m ?? 12,
        updatedAt: new Date(payload.current.time).toISOString(),
      },
      hourly,
      daily,
      provider: 'Open-Meteo',
    };
  }
}

function findCurrentIndex(hours: string[], currentTime: string) {
  const exactIndex = hours.findIndex((time) => time === currentTime);
  if (exactIndex >= 0) {
    return exactIndex;
  }

  const currentTimestamp = new Date(currentTime).getTime();
  const nearestIndex = hours.findIndex(
    (time) => new Date(time).getTime() >= currentTimestamp,
  );

  return nearestIndex >= 0 ? nearestIndex : 0;
}

function mapConditionCode(
  code: number | undefined,
  temperatureC: number,
  rainProbabilityPercent: number,
): { code: WeatherConditionCode; label: string } {
  if (temperatureC >= 36 && rainProbabilityPercent < 25) {
    return {
      code: 'HEAT' as const,
      label: 'Heat stress',
    };
  }

  switch (code) {
    case 0:
      return { code: 'CLEAR' as const, label: 'Clear sky' };
    case 1:
    case 2:
      return { code: 'PARTLY_CLOUDY' as const, label: 'Partly cloudy' };
    case 3:
      return { code: 'CLOUDY' as const, label: 'Cloudy' };
    case 45:
    case 48:
      return { code: 'FOG' as const, label: 'Foggy conditions' };
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return { code: 'LIGHT_RAIN' as const, label: 'Light rain' };
    case 61:
    case 63:
    case 80:
      return { code: 'RAIN' as const, label: 'Rain likely' };
    case 65:
    case 66:
    case 67:
    case 81:
    case 82:
      return { code: 'HEAVY_RAIN' as const, label: 'Heavy rain risk' };
    case 95:
    case 96:
    case 99:
      return { code: 'STORM' as const, label: 'Thunderstorm risk' };
    default:
      return {
        code: rainProbabilityPercent >= 50 ? 'RAIN' : 'UNKNOWN',
        label: rainProbabilityPercent >= 50 ? 'Rain watch' : 'Weather watch',
      };
  }
}
