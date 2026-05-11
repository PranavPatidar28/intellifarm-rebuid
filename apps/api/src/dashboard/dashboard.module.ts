import { Module } from '@nestjs/common';

import { DevicesModule } from '../devices/devices.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { RulesEngineModule } from '../rules-engine/rules-engine.module';
import { WeatherModule } from '../weather/weather.module';

@Module({
  imports: [RulesEngineModule, WeatherModule, DevicesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
