import { Module } from '@nestjs/common';

import { RulesEngineModule } from '../rules-engine/rules-engine.module';
import { WeatherModule } from '../weather/weather.module';
import { IntelliFarmMLService } from './intellifarm-ml.service';
import { PredictionsController } from './predictions.controller';
import { PredictionsService } from './predictions.service';
import { SeasonClimateService } from './season-climate.service';
import { SoilProfileResolver } from './soil-profile.resolver';

@Module({
  imports: [WeatherModule, RulesEngineModule],
  controllers: [PredictionsController],
  providers: [
    PredictionsService,
    IntelliFarmMLService,
    SeasonClimateService,
    SoilProfileResolver,
  ],
  exports: [PredictionsService],
})
export class PredictionsModule {}
