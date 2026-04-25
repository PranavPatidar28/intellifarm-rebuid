import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  cropSuggestionPredictionSchema,
  predictionRunsQuerySchema,
  resourcePredictionSchema,
} from '@intellifarm/contracts';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import type { AuthUser } from '../common/types/authenticated-request';
import { parseWithSchema } from '../common/utils/zod.util';
import { PredictionsService } from './predictions.service';

@ApiTags('predictions')
@UseGuards(AuthGuard)
@Controller('predictions')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Get('runs')
  listRuns(@CurrentUser() user: AuthUser, @Query() query: unknown) {
    return this.predictionsService.listPredictionRuns(
      user.sub,
      parseWithSchema(predictionRunsQuerySchema, query),
    );
  }

  @Post('crop-suggestions')
  predictCropSuggestions(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.predictionsService.predictCropSuggestions(
      user.sub,
      parseWithSchema(cropSuggestionPredictionSchema, body),
    );
  }

  @Post('resources')
  predictResources(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.predictionsService.predictResources(
      user.sub,
      parseWithSchema(resourcePredictionSchema, body),
    );
  }
}
