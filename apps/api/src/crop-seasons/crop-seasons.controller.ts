import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  createCropSeasonSchema,
  updateCropSeasonSchema,
} from '@intellifarm/contracts';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import type { AuthUser } from '../common/types/authenticated-request';
import { parseWithSchema } from '../common/utils/zod.util';
import { CropSeasonsService } from './crop-seasons.service';

@ApiTags('crop-seasons')
@UseGuards(AuthGuard)
@Controller()
export class CropSeasonsController {
  constructor(private readonly cropSeasonsService: CropSeasonsService) {}

  @Post('farm-plots/:id/crop-seasons')
  create(
    @CurrentUser() user: AuthUser,
    @Param('id') farmPlotId: string,
    @Body() body: unknown,
  ) {
    return this.cropSeasonsService.createCropSeason(
      user.sub,
      farmPlotId,
      parseWithSchema(createCropSeasonSchema, body),
    );
  }

  @Get('crop-seasons/:id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cropSeasonsService.getCropSeason(user.sub, id);
  }

  @Patch('crop-seasons/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.cropSeasonsService.updateCropSeason(
      user.sub,
      id,
      parseWithSchema(updateCropSeasonSchema, body),
    );
  }

  @Get('crop-seasons/:id/timeline')
  getTimeline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cropSeasonsService.getTimeline(user.sub, id);
  }
}
