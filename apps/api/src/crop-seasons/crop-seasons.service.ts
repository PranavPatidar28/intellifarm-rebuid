import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RulesEngineService } from '../rules-engine/rules-engine.service';

@Injectable()
export class CropSeasonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesEngineService: RulesEngineService,
  ) {}

  async createCropSeason(
    userId: string,
    farmPlotId: string,
    payload: {
      cropDefinitionId: string;
      cropName: string;
      sowingDate: Date;
      status: 'PLANNED' | 'ACTIVE' | 'HARVESTED' | 'ARCHIVED';
    },
  ) {
    const farmPlot = await this.prisma.farmPlot.findFirst({
      where: { id: farmPlotId, userId },
    });

    if (!farmPlot) {
      throw new NotFoundException('Farm plot not found');
    }

    const activeSeason = await this.prisma.cropSeason.findFirst({
      where: {
        farmPlotId,
        status: 'ACTIVE',
      },
    });

    if (activeSeason && payload.status === 'ACTIVE') {
      throw new BadRequestException(
        'This farm plot already has an active crop season. Close it before creating another active one.',
      );
    }

    const cropSeason = await this.prisma.cropSeason.create({
      data: {
        farmPlotId,
        cropDefinitionId: payload.cropDefinitionId,
        cropName: payload.cropName,
        sowingDate: payload.sowingDate,
        currentStage: 'Monitoring',
        status: payload.status,
      },
    });

    await this.rulesEngineService.syncSeasonLifecycle(cropSeason.id);

    return this.getCropSeason(userId, cropSeason.id);
  }

  async getCropSeason(userId: string, cropSeasonId: string) {
    const cropSeason = await this.prisma.cropSeason.findFirst({
      where: {
        id: cropSeasonId,
        farmPlot: {
          userId,
        },
      },
      include: {
        cropDefinition: {
          include: {
            stageRules: { orderBy: { sortOrder: 'asc' } },
          },
        },
        farmPlot: true,
        tasks: {
          orderBy: { dueDate: 'asc' },
        },
        diseaseReports: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cropSeason) {
      throw new NotFoundException('Crop season not found');
    }

    return { cropSeason };
  }

  async updateCropSeason(
    userId: string,
    cropSeasonId: string,
    payload: Partial<{
      cropDefinitionId: string;
      cropName: string;
      sowingDate: Date;
      status: 'PLANNED' | 'ACTIVE' | 'HARVESTED' | 'ARCHIVED';
    }>,
  ) {
    const season = await this.prisma.cropSeason.findFirst({
      where: {
        id: cropSeasonId,
        farmPlot: { userId },
      },
    });

    if (!season) {
      throw new NotFoundException('Crop season not found');
    }

    await this.prisma.cropSeason.update({
      where: { id: cropSeasonId },
      data: payload,
    });

    await this.rulesEngineService.syncSeasonLifecycle(cropSeasonId);

    return this.getCropSeason(userId, cropSeasonId);
  }

  async getTimeline(userId: string, cropSeasonId: string) {
    const season = await this.getCropSeason(userId, cropSeasonId);
    return {
      cropSeason: season.cropSeason,
      stages: season.cropSeason.cropDefinition.stageRules,
      tasks: season.cropSeason.tasks,
    };
  }
}
