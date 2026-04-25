import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  DataGovMarketProvider,
  MARKET_PROVIDER,
  SeededMarketProvider,
} from './market-provider';
import { MarketsController } from './markets.controller';
import { MarketsService } from './markets.service';

@Module({
  controllers: [MarketsController],
  providers: [
    MarketsService,
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
