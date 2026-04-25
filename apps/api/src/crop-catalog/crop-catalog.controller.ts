import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../common/guards/auth.guard';
import { CropCatalogService } from './crop-catalog.service';

@ApiTags('crop-catalog')
@UseGuards(AuthGuard)
@Controller('crop-definitions')
export class CropCatalogController {
  constructor(private readonly cropCatalogService: CropCatalogService) {}

  @Get()
  listActiveCropDefinitions() {
    return this.cropCatalogService.listActiveCropDefinitions();
  }
}
