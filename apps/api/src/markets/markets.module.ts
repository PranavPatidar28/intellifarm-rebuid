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
import { ScraperMarketProvider } from './scraper-market-provider';

@Module({
  imports: [PrismaModule],
  controllers: [MarketsController],
  providers: [
    MarketsService,
    MandiLocationEngine,
    SeededMarketProvider,
    DataGovMarketProvider,
    ScraperMarketProvider,
    {
      provide: MARKET_PROVIDER,
      inject: [
        ConfigService,
        SeededMarketProvider,
        DataGovMarketProvider,
        ScraperMarketProvider,
      ],
      useFactory: (
        configService: ConfigService,
        seededMarketProvider: SeededMarketProvider,
        dataGovMarketProvider: DataGovMarketProvider,
        scraperMarketProvider: ScraperMarketProvider,
      ) => {
        const mode = configService.get<string>(
          'MARKET_PROVIDER_MODE',
          'scraper',
        );

        switch (mode) {
          case 'live':
            return dataGovMarketProvider;
          case 'seeded':
            return seededMarketProvider;
          case 'scraper':
          default:
            return scraperMarketProvider;
        }
      },
    },
  ],
  exports: [MarketsService],
})
export class MarketsModule {}
