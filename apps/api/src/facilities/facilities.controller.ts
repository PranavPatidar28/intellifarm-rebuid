import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { nearbyFacilitiesQuerySchema } from '@intellifarm/contracts';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import type { AuthUser } from '../common/types/authenticated-request';
import { parseWithSchema } from '../common/utils/zod.util';
import { FacilitiesService } from './facilities.service';

@ApiTags('facilities')
@UseGuards(AuthGuard)
@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Get('nearby')
  listNearby(
    @CurrentUser() user: AuthUser,
    @Query() query: Record<string, unknown>,
  ) {
    return this.facilitiesService.listNearbyFacilities(
      user.sub,
      parseWithSchema(nearbyFacilitiesQuerySchema, query),
    );
  }
}
