import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  marketExplorerQuerySchema,
  marketQuerySchema,
} from '@intellifarm/contracts';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import type { AuthUser } from '../common/types/authenticated-request';
import { parseWithSchema } from '../common/utils/zod.util';
import { MarketsService } from './markets.service';

@ApiTags('markets')
@UseGuards(AuthGuard)
@Controller('markets')
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  @Get('explorer/crops')
  listExplorerCrops(
    @CurrentUser() user: AuthUser,
    @Query() query: Record<string, unknown>,
  ) {
    return this.marketsService.listExplorerCrops(
      user.sub,
      parseWithSchema(marketExplorerQuerySchema, query),
    );
  }

  @Get('explorer/mandis')
  listExplorerMandis(
    @CurrentUser() user: AuthUser,
    @Query() query: Record<string, unknown>,
  ) {
    return this.marketsService.listExplorerMandis(
      user.sub,
      parseWithSchema(marketExplorerQuerySchema, query),
    );
  }

  @Get('explorer/crops/:cropName')
  getExplorerCropDetail(
    @CurrentUser() user: AuthUser,
    @Param('cropName') cropName: string,
    @Query() query: Record<string, unknown>,
  ) {
    const { page: _page, pageSize: _pageSize, search: _search, ...detailQuery } =
      parseWithSchema(marketExplorerQuerySchema, query);

    return this.marketsService.getCropDetail(user.sub, cropName, detailQuery);
  }

  @Get('explorer/mandis/:mandiKey')
  getExplorerMandiDetail(
    @CurrentUser() user: AuthUser,
    @Param('mandiKey') mandiKey: string,
    @Query() query: Record<string, unknown>,
  ) {
    const { page: _page, pageSize: _pageSize, search: _search, ...detailQuery } =
      parseWithSchema(marketExplorerQuerySchema, query);

    return this.marketsService.getMandiDetail(user.sub, mandiKey, detailQuery);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: Record<string, unknown>) {
    return this.marketsService.listMarkets(
      user.sub,
      parseWithSchema(marketQuerySchema, query),
    );
  }
}
