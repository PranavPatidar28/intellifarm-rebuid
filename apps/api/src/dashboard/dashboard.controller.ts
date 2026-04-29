import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { dashboardQuerySchema } from '@intellifarm/contracts';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import type { AuthUser } from '../common/types/authenticated-request';
import { parseWithSchema } from '../common/utils/zod.util';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@UseGuards(AuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('weekly')
  getWeeklyDashboard(
    @CurrentUser() user: AuthUser,
    @Query() query: Record<string, unknown>,
  ) {
    const location = parseWithSchema(dashboardQuerySchema, query);
    const locationOverride =
      typeof location.latitude === 'number' &&
      typeof location.longitude === 'number'
        ? {
            latitude: location.latitude,
            longitude: location.longitude,
          }
        : undefined;

    return this.dashboardService.getWeeklyDashboard(
      user.sub,
      locationOverride,
      location.cropSeasonId,
    );
  }
}
