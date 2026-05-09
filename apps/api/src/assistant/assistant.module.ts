import { Module } from '@nestjs/common';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { PredictionsModule } from '../predictions/predictions.module';
import { DiseaseReportsModule } from '../disease-reports/disease-reports.module';
import { RulesEngineModule } from '../rules-engine/rules-engine.module';

@Module({
  imports: [PredictionsModule, DiseaseReportsModule, RulesEngineModule],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
