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
  createFarmPlotSchema,
  updateFarmPlotSchema,
} from '@intellifarm/contracts';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import type { AuthUser } from '../common/types/authenticated-request';
import { parseWithSchema } from '../common/utils/zod.util';
import { FarmsService } from './farms.service';

@ApiTags('farm-plots')
@UseGuards(AuthGuard)
@Controller('farm-plots')
export class FarmsController {
  constructor(private readonly farmsService: FarmsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.farmsService.listFarmPlots(user.sub);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.farmsService.createFarmPlot(
      user.sub,
      parseWithSchema(createFarmPlotSchema, body),
    );
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.farmsService.getFarmPlot(user.sub, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.farmsService.updateFarmPlot(
      user.sub,
      id,
      parseWithSchema(updateFarmPlotSchema, body),
    );
  }
}
