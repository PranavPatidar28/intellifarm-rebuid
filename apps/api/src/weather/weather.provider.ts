import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type WeatherForecast = {
  currentTemperatureC: number;
  humidityPercent: number;
  rainfallExpectedMm: number;
  forecastSummary: string;
  forecastDays: Array<{
    date: string;
    maxTemperatureC: number;
    minTemperatureC: number;
    rainfallMm: number;
  }>;
  source: string;
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
    temperature_2m: number;
    relative_humidity_2m?: number;
  };
  daily: {
    time: string[];
    precipitation_sum: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
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
      current: 'temperature_2m,relative_humidity_2m',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
      forecast_days: '3',
      timezone: 'auto',
    });
    const response = await fetch(`${baseUrl}?${query.toString()}`);

    if (!response.ok) {
      throw new Error(`Weather provider failed with ${response.status}`);
    }

    const payload = (await response.json()) as WeatherPayload;
    const forecastDays = payload.daily.time.map((date, index) => ({
      date,
      maxTemperatureC:
        payload.daily.temperature_2m_max[index] ??
        payload.current.temperature_2m,
      minTemperatureC:
        payload.daily.temperature_2m_min[index] ??
        payload.current.temperature_2m,
      rainfallMm: payload.daily.precipitation_sum[index] ?? 0,
    }));
    const rainfallExpectedMm = forecastDays.reduce(
      (sum, day) => sum + day.rainfallMm,
      0,
    );

    return {
      currentTemperatureC: payload.current.temperature_2m,
      humidityPercent: payload.current.relative_humidity_2m ?? 68,
      rainfallExpectedMm,
      forecastSummary: `Current ${Math.round(payload.current.temperature_2m)}C, next 3 days rain ${rainfallExpectedMm.toFixed(1)} mm.`,
      forecastDays,
      source: 'Open-Meteo',
    };
  }
}
