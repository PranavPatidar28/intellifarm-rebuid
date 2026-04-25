import { Module } from '@nestjs/common';

import { OpenMeteoWeatherProvider, WEATHER_PROVIDER } from './weather.provider';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';

@Module({
  controllers: [WeatherController],
  providers: [
    WeatherService,
    OpenMeteoWeatherProvider,
    {
      provide: WEATHER_PROVIDER,
      useExisting: OpenMeteoWeatherProvider,
    },
  ],
  exports: [WeatherService, WEATHER_PROVIDER, OpenMeteoWeatherProvider],
})
export class WeatherModule {}
