import { Module } from '@nestjs/common';

import { CropCatalogController } from './crop-catalog.controller';
import { CropCatalogService } from './crop-catalog.service';

@Module({
  controllers: [CropCatalogController],
  providers: [CropCatalogService],
  exports: [CropCatalogService],
})
export class CropCatalogModule {}
