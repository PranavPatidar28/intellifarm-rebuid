import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { WeatherModule } from '../weather/weather.module';
import { RulesEngineService } from './rules-engine.service';

@Module({
  imports: [NotificationsModule, WeatherModule],
  providers: [RulesEngineService],
  exports: [RulesEngineService],
})
export class RulesEngineModule {}
