import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RulesEngineModule } from '../rules-engine/rules-engine.module';
import { WeatherModule } from '../weather/weather.module';
import {
  HttpPredictionProvider,
  MockPredictionProvider,
  PREDICTION_PROVIDER,
  RailwayCropPredictionProvider,
} from './prediction-provider';
import { PredictionsController } from './predictions.controller';
import { PredictionsService } from './predictions.service';
import { SeasonClimateService } from './season-climate.service';
import { SoilProfileResolver } from './soil-profile.resolver';

@Module({
  imports: [WeatherModule, RulesEngineModule],
  controllers: [PredictionsController],
  providers: [
    PredictionsService,
    SeasonClimateService,
    SoilProfileResolver,
    MockPredictionProvider,
    HttpPredictionProvider,
    RailwayCropPredictionProvider,
    {
      provide: PREDICTION_PROVIDER,
      inject: [
        ConfigService,
        MockPredictionProvider,
        HttpPredictionProvider,
        RailwayCropPredictionProvider,
      ],
      useFactory: (
        configService: ConfigService,
        mockPredictionProvider: MockPredictionProvider,
        httpPredictionProvider: HttpPredictionProvider,
        railwayCropPredictionProvider: RailwayCropPredictionProvider,
      ) => {
        const mode = configService.get<string>(
          'PREDICTION_PROVIDER_MODE',
          'mock',
        );

        if (mode === 'railway') {
          return railwayCropPredictionProvider;
        }

        if (mode === 'live') {
          return httpPredictionProvider;
        }

        return mockPredictionProvider;
      },
    },
  ],
})
export class PredictionsModule {}
