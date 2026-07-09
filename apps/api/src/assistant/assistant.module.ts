import { Module } from '@nestjs/common';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { AlertsModule } from '../alerts/alerts.module';
import { CropSeasonsModule } from '../crop-seasons/crop-seasons.module';
import { DevicesModule } from '../devices/devices.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { PredictionsModule } from '../predictions/predictions.module';
import { DiseaseReportsModule } from '../disease-reports/disease-reports.module';
import { FarmsModule } from '../farms/farms.module';
import { MarketsModule } from '../markets/markets.module';
import { RulesEngineModule } from '../rules-engine/rules-engine.module';
import { SchemesModule } from '../schemes/schemes.module';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';
import { WeatherModule } from '../weather/weather.module';
import { AssistantInteractionLogService } from './assistant-interaction-log.service';
import { AssistantToolRegistryService } from './assistant-tool-registry.service';
import { VoiceGateway } from './voice.gateway';
import { GeminiLiveService } from './gemini-live.service';
import { VoiceSessionStoreService } from './voice-session-store.service';
import { VoiceTicketService } from './voice-ticket.service';

@Module({
  imports: [
    AlertsModule,
    CropSeasonsModule,
    DevicesModule,
    DiseaseReportsModule,
    ExpensesModule,
    FarmsModule,
    MarketsModule,
    PredictionsModule,
    RulesEngineModule,
    SchemesModule,
    TasksModule,
    UsersModule,
    WeatherModule,
  ],
  controllers: [AssistantController],
  providers: [
    AssistantInteractionLogService,
    AssistantService,
    AssistantToolRegistryService,
    GeminiLiveService,
    VoiceGateway,
    VoiceSessionStoreService,
    VoiceTicketService,
  ],
})
export class AssistantModule {}
