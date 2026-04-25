import { Module } from '@nestjs/common';

import { CropSeasonsController } from './crop-seasons.controller';
import { CropSeasonsService } from './crop-seasons.service';
import { RulesEngineModule } from '../rules-engine/rules-engine.module';

@Module({
  imports: [RulesEngineModule],
  controllers: [CropSeasonsController],
  providers: [CropSeasonsService],
  exports: [CropSeasonsService],
})
export class CropSeasonsModule {}
