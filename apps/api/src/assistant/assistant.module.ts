import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DiseaseReportsModule } from '../disease-reports/disease-reports.module';
import { RulesEngineModule } from '../rules-engine/rules-engine.module';
import { WeatherModule } from '../weather/weather.module';
import {
  ASSISTANT_PROVIDER,
  GeminiAssistantProvider,
  MockAssistantProvider,
} from './assistant.provider';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

@Module({
  imports: [WeatherModule, RulesEngineModule, DiseaseReportsModule],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    MockAssistantProvider,
    GeminiAssistantProvider,
    {
      provide: ASSISTANT_PROVIDER,
      inject: [ConfigService, MockAssistantProvider, GeminiAssistantProvider],
      useFactory: (
        configService: ConfigService,
        mockAssistantProvider: MockAssistantProvider,
        geminiAssistantProvider: GeminiAssistantProvider,
      ) => {
        const providerMode = configService.get<string>(
          'AI_ASSISTANT_PROVIDER_MODE',
          'mock',
        );
        return providerMode === 'gemini' || providerMode === 'live'
          ? geminiAssistantProvider
          : mockAssistantProvider;
      },
    },
  ],
})
export class AssistantModule {}
