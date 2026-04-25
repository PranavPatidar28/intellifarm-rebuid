import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { weatherLocationQuerySchema } from '@intellifarm/contracts';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import type { AuthUser } from '../common/types/authenticated-request';
import { parseWithSchema } from '../common/utils/zod.util';
import { WeatherService } from './weather.service';

@ApiTags('weather')
@UseGuards(AuthGuard)
@Controller('farm-plots')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get(':id/weather')
  getPlotWeather(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: Record<string, unknown>,
  ) {
    const location = parseWithSchema(weatherLocationQuerySchema, query);
    const locationOverride =
      typeof location.latitude === 'number' &&
      typeof location.longitude === 'number'
        ? {
            latitude: location.latitude,
            longitude: location.longitude,
          }
        : undefined;

    return this.weatherService.getPlotWeather(user.sub, id, locationOverride);
  }
}
