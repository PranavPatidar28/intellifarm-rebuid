import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { parseWithSchema } from '../common/utils/zod.util';
import { AdminService } from './admin.service';

const cropDefinitionSchema = z.object({
  slug: z.string().trim().min(2),
  nameEn: z.string().trim().min(2),
  nameHi: z.string().trim().min(2),
  active: z.boolean().default(true),
});

const cropStageRuleSchema = z.object({
  cropDefinitionId: z.string().uuid(),
  stageKey: z.string().trim().min(2),
  labelEn: z.string().trim().min(2),
  labelHi: z.string().trim().min(2),
  startDay: z.number().int().min(0),
  endDay: z.number().int().min(0),
  sortOrder: z.number().int().min(1),
});

const taskTemplateSchema = z.object({
  cropDefinitionId: z.string().uuid(),
  stageKey: z.string().trim().min(2),
  titleEn: z.string().trim().min(2),
  titleHi: z.string().trim().min(2),
  descriptionEn: z.string().trim().min(2),
  descriptionHi: z.string().trim().min(2),
  dueDayOffset: z.number().int().min(0),
  taskType: z.enum([
    'IRRIGATION',
    'FERTILIZER',
    'SCOUTING',
    'HARVEST_PREP',
    'GENERAL',
  ]),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  active: z.boolean().default(true),
});

const schemeSchema = z.object({
  title: z.string().trim().min(2),
  titleHi: z.string().trim().optional(),
  description: z.string().trim().min(10),
  descriptionHi: z.string().trim().optional(),
  category: z.string().trim().min(2),
  applicableState: z.string().trim().min(2),
  officialLink: z.string().url(),
  language: z.enum(['en', 'hi']).default('en'),
  active: z.boolean().default(true),
});

const communityPostModerationSchema = z
  .object({
    hidden: z.boolean().optional(),
    locked: z.boolean().optional(),
  })
  .refine(
    (value) => typeof value.hidden === 'boolean' || typeof value.locked === 'boolean',
    {
      message: 'Provide at least one moderation field',
    },
  );

const communityReplyModerationSchema = z.object({
  hidden: z.boolean(),
});

@ApiTags('admin')
@Roles('ADMIN')
@UseGuards(AuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  overview() {
    return this.adminService.getOverview();
  }

  @Get('crop-definitions')
  listCropDefinitions() {
    return this.adminService.listCropDefinitions();
  }

  @Post('crop-definitions')
  createCropDefinition(@Body() body: unknown) {
    return this.adminService.createCropDefinition(
      parseWithSchema(cropDefinitionSchema, body),
    );
  }

  @Patch('crop-definitions/:id')
  updateCropDefinition(@Param('id') id: string, @Body() body: unknown) {
    return this.adminService.updateCropDefinition(
      id,
      parseWithSchema(cropDefinitionSchema.partial(), body),
    );
  }

  @Get('crop-stage-rules')
  listCropStageRules() {
    return this.adminService.listCropStageRules();
  }

  @Post('crop-stage-rules')
  createCropStageRule(@Body() body: unknown) {
    return this.adminService.createCropStageRule(
      parseWithSchema(cropStageRuleSchema, body),
    );
  }

  @Patch('crop-stage-rules/:id')
  updateCropStageRule(@Param('id') id: string, @Body() body: unknown) {
    return this.adminService.updateCropStageRule(
      id,
      parseWithSchema(cropStageRuleSchema.partial(), body),
    );
  }

  @Get('task-templates')
  listTaskTemplates() {
    return this.adminService.listTaskTemplates();
  }

  @Post('task-templates')
  createTaskTemplate(@Body() body: unknown) {
    return this.adminService.createTaskTemplate(
      parseWithSchema(taskTemplateSchema, body),
    );
  }

  @Patch('task-templates/:id')
  updateTaskTemplate(@Param('id') id: string, @Body() body: unknown) {
    return this.adminService.updateTaskTemplate(
      id,
      parseWithSchema(taskTemplateSchema.partial(), body),
    );
  }

  @Get('schemes')
  listSchemes() {
    return this.adminService.listSchemes();
  }

  @Post('schemes')
  createScheme(@Body() body: unknown) {
    return this.adminService.createScheme(parseWithSchema(schemeSchema, body));
  }

  @Patch('schemes/:id')
  updateScheme(@Param('id') id: string, @Body() body: unknown) {
    return this.adminService.updateScheme(
      id,
      parseWithSchema(schemeSchema.partial(), body),
    );
  }

  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Get('farm-plots')
  listFarmPlots() {
    return this.adminService.listFarmPlots();
  }

  @Get('crop-seasons')
  listCropSeasons() {
    return this.adminService.listCropSeasons();
  }

  @Get('disease-reports')
  listDiseaseReports() {
    return this.adminService.listDiseaseReports();
  }

  @Get('community/reports')
  listCommunityReports() {
    return this.adminService.listCommunityReports();
  }

  @Patch('community/posts/:id')
  moderateCommunityPost(@Param('id') id: string, @Body() body: unknown) {
    return this.adminService.moderateCommunityPost(
      id,
      parseWithSchema(communityPostModerationSchema, body),
    );
  }

  @Patch('community/replies/:id')
  moderateCommunityReply(@Param('id') id: string, @Body() body: unknown) {
    return this.adminService.moderateCommunityReply(
      id,
      parseWithSchema(communityReplyModerationSchema, body),
    );
  }

  @Patch('community/reports/:id/resolve')
  resolveCommunityReport(@Param('id') id: string) {
    return this.adminService.resolveCommunityReport(id);
  }
}
