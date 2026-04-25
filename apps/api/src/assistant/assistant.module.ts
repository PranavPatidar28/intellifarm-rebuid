import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RulesEngineModule } from '../rules-engine/rules-engine.module';
import { WeatherModule } from '../weather/weather.module';
import {
  ASSISTANT_PROVIDER,
  MockAssistantProvider,
  OpenAiCompatibleAssistantProvider,
} from './assistant.provider';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

@Module({
  imports: [WeatherModule, RulesEngineModule],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    MockAssistantProvider,
    OpenAiCompatibleAssistantProvider,
    {
      provide: ASSISTANT_PROVIDER,
      inject: [
        ConfigService,
        MockAssistantProvider,
        OpenAiCompatibleAssistantProvider,
      ],
      useFactory: (
        configService: ConfigService,
        mockAssistantProvider: MockAssistantProvider,
        openAiCompatibleAssistantProvider: OpenAiCompatibleAssistantProvider,
      ) =>
        configService.get<string>('AI_ASSISTANT_PROVIDER_MODE', 'mock') ===
        'live'
          ? openAiCompatibleAssistantProvider
          : mockAssistantProvider,
    },
  ],
})
export class AssistantModule {}
