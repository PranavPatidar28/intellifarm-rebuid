import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

import { createDiseaseReportSchema } from '@intellifarm/contracts';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import type { AuthUser } from '../common/types/authenticated-request';
import { parseWithSchema } from '../common/utils/zod.util';
import { DiseaseReportsService } from './disease-reports.service';

@ApiTags('disease-reports')
@UseGuards(AuthGuard)
@Controller('disease-reports')
export class DiseaseReportsController {
  constructor(private readonly diseaseReportsService: DiseaseReportsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.diseaseReportsService.listReports(user.sub);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.diseaseReportsService.getReport(user.sub, id);
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'images', maxCount: 2 },
      { name: 'voiceNote', maxCount: 1 },
    ]),
  )
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: Record<string, unknown>,
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
      voiceNote?: Express.Multer.File[];
    },
  ) {
    return this.diseaseReportsService.createReport(
      user.sub,
      parseWithSchema(createDiseaseReportSchema, body),
      files,
    );
  }
}
