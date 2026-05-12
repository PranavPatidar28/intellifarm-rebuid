import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaModule } from '../prisma/prisma.module';
import {
  DataGovMarketProvider,
  MARKET_PROVIDER,
  SeededMarketProvider,
} from './market-provider';
import { MandiLocationEngine } from './mandi-location.engine';
import { MarketsController } from './markets.controller';
import { MarketsService } from './markets.service';

@Module({
  imports: [PrismaModule],
  controllers: [MarketsController],
  providers: [
    MarketsService,
    MandiLocationEngine,
    SeededMarketProvider,
    DataGovMarketProvider,
    {
      provide: MARKET_PROVIDER,
      inject: [ConfigService, SeededMarketProvider, DataGovMarketProvider],
      useFactory: (
        configService: ConfigService,
        seededMarketProvider: SeededMarketProvider,
        dataGovMarketProvider: DataGovMarketProvider,
      ) =>
        configService.get<string>('MARKET_PROVIDER_MODE', 'seeded') === 'live'
          ? dataGovMarketProvider
          : seededMarketProvider,
    },
  ],
  exports: [MarketsService],
})
export class MarketsModule {}
