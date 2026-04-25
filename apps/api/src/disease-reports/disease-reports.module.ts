import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  DISEASE_PROVIDER,
  HttpDiseaseProvider,
  MockDiseaseProvider,
} from './disease-provider';
import { DiseaseReportsController } from './disease-reports.controller';
import { DiseaseReportsService } from './disease-reports.service';

@Module({
  controllers: [DiseaseReportsController],
  providers: [
    DiseaseReportsService,
    MockDiseaseProvider,
    HttpDiseaseProvider,
    {
      provide: DISEASE_PROVIDER,
      inject: [ConfigService, MockDiseaseProvider, HttpDiseaseProvider],
      useFactory: (
        configService: ConfigService,
        mockDiseaseProvider: MockDiseaseProvider,
        httpDiseaseProvider: HttpDiseaseProvider,
      ) =>
        configService.get<string>('DISEASE_PROVIDER_MODE', 'mock') === 'live'
          ? httpDiseaseProvider
          : mockDiseaseProvider,
    },
  ],
})
export class DiseaseReportsModule {}
