import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FarmsService {
  constructor(private readonly prisma: PrismaService) {}

  async listFarmPlots(userId: string) {
    const farmPlots = await this.prisma.farmPlot.findMany({
      where: { userId },
      include: {
        cropSeasons: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { farmPlots };
  }

  async createFarmPlot(
    userId: string,
    payload: {
      name: string;
      state: string;
      district: string;
      village: string;
      area: number;
      latitude?: number | null;
      longitude?: number | null;
      irrigationType: 'RAIN_FED' | 'DRIP' | 'SPRINKLER' | 'FLOOD' | 'MANUAL';
      soilType?:
        | 'ALLUVIAL'
        | 'BLACK_REGUR'
        | 'RED'
        | 'LATERITE'
        | 'SANDY'
        | 'CLAY_HEAVY'
        | 'LOAMY_MIXED'
        | 'NOT_SURE'
        | null;
    },
  ) {
    const farmPlot = await this.prisma.farmPlot.create({
      data: {
        userId,
        ...payload,
      },
    });

    return { farmPlot };
  }

  async getFarmPlot(userId: string, farmPlotId: string) {
    const farmPlot = await this.prisma.farmPlot.findFirst({
      where: { id: farmPlotId, userId },
      include: {
        cropSeasons: {
          include: {
            tasks: {
              orderBy: { dueDate: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!farmPlot) {
      throw new NotFoundException('Farm plot not found');
    }

    return { farmPlot };
  }

  async updateFarmPlot(
    userId: string,
    farmPlotId: string,
    payload: Partial<{
      name: string;
      state: string;
      district: string;
      village: string;
      area: number;
      latitude?: number | null;
      longitude?: number | null;
      irrigationType: 'RAIN_FED' | 'DRIP' | 'SPRINKLER' | 'FLOOD' | 'MANUAL';
      soilType?:
        | 'ALLUVIAL'
        | 'BLACK_REGUR'
        | 'RED'
        | 'LATERITE'
        | 'SANDY'
        | 'CLAY_HEAVY'
        | 'LOAMY_MIXED'
        | 'NOT_SURE'
        | null;
    }>,
  ) {
    await this.ensureOwnership(userId, farmPlotId);

    const farmPlot = await this.prisma.farmPlot.update({
      where: { id: farmPlotId },
      data: payload,
    });

    return { farmPlot };
  }

  private async ensureOwnership(userId: string, farmPlotId: string) {
    const farmPlot = await this.prisma.farmPlot.findFirst({
      where: { id: farmPlotId, userId },
    });

    if (!farmPlot) {
      throw new NotFoundException('Farm plot not found');
    }

    return farmPlot;
  }
}
