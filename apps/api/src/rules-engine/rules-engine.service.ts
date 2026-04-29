import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { CropDefinition, FarmPlot } from '../generated/prisma';

import { addDays, diffInDays, startOfToday } from '../common/utils/date.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from '../weather/weather.service';

type WeatherSummary = {
  current: {
    temperatureC: number;
    rainfallExpectedMm: number;
    conditionLabel: string;
  };
  fieldWindows?: {
    sprayWindow?: {
      summary: string;
    };
  };
  advisories?: Array<{
    title: string;
    message: string;
  }>;
};

@Injectable()
export class RulesEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly weatherService: WeatherService,
  ) {}

  async syncSeasonLifecycle(cropSeasonId: string) {
    const season = await this.prisma.cropSeason.findUnique({
      where: { id: cropSeasonId },
      include: {
        cropDefinition: {
          include: {
            stageRules: { orderBy: { sortOrder: 'asc' } },
            taskTemplates: { where: { active: true } },
          },
        },
        farmPlot: true,
      },
    });

    if (!season) {
      throw new NotFoundException('Crop season not found');
    }

    const currentStage = this.computeStage(
      season.cropDefinition,
      season.sowingDate,
    );

    await this.prisma.cropSeason.update({
      where: { id: season.id },
      data: { currentStage },
    });

    for (const template of season.cropDefinition.taskTemplates) {
      const dueDate = addDays(
        new Date(season.sowingDate),
        template.dueDayOffset,
      );
      const today = startOfToday();
      const status =
        dueDate.getTime() < today.getTime() ? 'OVERDUE' : 'PENDING';

      await this.prisma.cropTask.upsert({
        where: {
          cropSeasonId_taskTemplateId_dueDate: {
            cropSeasonId: season.id,
            taskTemplateId: template.id,
            dueDate,
          },
        },
        update: {
          title: template.titleEn,
          description: template.descriptionEn,
          priority: template.priority,
          taskType: template.taskType,
          status,
        },
        create: {
          cropSeasonId: season.id,
          taskTemplateId: template.id,
          title: template.titleEn,
          description: template.descriptionEn,
          dueDate,
          taskType: template.taskType,
          priority: template.priority,
          status,
          generatedBy: 'RULES_ENGINE',
        },
      });
    }

    await this.prisma.cropTask.updateMany({
      where: {
        cropSeasonId: season.id,
        status: 'PENDING',
        dueDate: {
          lt: startOfToday(),
        },
      },
      data: { status: 'OVERDUE' },
    });

    return this.prisma.cropSeason.findUnique({
      where: { id: season.id },
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
      },
    });
  }

  computeStage(
    cropDefinition: CropDefinition & {
      stageRules: Array<{ labelEn: string; startDay: number; endDay: number }>;
    },
    sowingDate: Date,
  ) {
    const daysSinceSowing = Math.max(
      0,
      diffInDays(new Date(sowingDate), new Date()),
    );
    const match =
      cropDefinition.stageRules.find(
        (rule) =>
          daysSinceSowing >= rule.startDay && daysSinceSowing <= rule.endDay,
      ) ?? cropDefinition.stageRules.at(-1);

    return match?.labelEn ?? 'Monitoring';
  }

  buildWeatherAdvisories(params: {
    weather: WeatherSummary;
    cropName: string;
    currentStage: string;
    irrigationType: FarmPlot['irrigationType'];
  }) {
    const advisories: string[] = [];

    if (params.weather.current.rainfallExpectedMm >= 20) {
      advisories.push(
        `Rain expected soon for ${params.cropName}. Avoid spraying right now.`,
      );
    }

    if (
      params.weather.current.rainfallExpectedMm < 3 &&
      params.weather.current.temperatureC >= 33
    ) {
      advisories.push(
        `Hot and dry conditions may stress the crop at ${params.currentStage.toLowerCase()} stage. Review irrigation timing.`,
      );
    }

    if (
      params.irrigationType === 'RAIN_FED' &&
      params.weather.current.rainfallExpectedMm < 5
    ) {
      advisories.push(
        'Low expected rainfall this week. Monitor soil moisture closely.',
      );
    }

    if (params.weather.fieldWindows?.sprayWindow?.summary) {
      advisories.push(params.weather.fieldWindows.sprayWindow.summary);
    }

    if (advisories.length === 0) {
      advisories.push(
        params.weather.advisories?.[0]?.message ??
          `Weather looks stable this week. ${params.weather.current.conditionLabel}. Continue regular field scouting.`,
      );
    }

    return Array.from(new Set(advisories)).slice(0, 3);
  }

  async applyWeatherAlerts(params: {
    userId: string;
    cropSeasonId: string;
    cropName: string;
    currentStage: string;
    weather: WeatherSummary;
    irrigationType: FarmPlot['irrigationType'];
  }) {
    const alerts: Array<{
      title: string;
      message: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }> = [];

    if (params.weather.current.rainfallExpectedMm >= 30) {
      alerts.push({
        title: 'Heavy rain likely this week',
        message: `Expected rain may affect ${params.cropName} at ${params.currentStage.toLowerCase()} stage. Check drainage and avoid unnecessary spray activity.`,
        severity: 'HIGH',
      });
    }

    if (
      params.weather.current.temperatureC >= 35 &&
      params.weather.current.rainfallExpectedMm < 2
    ) {
      alerts.push({
        title: 'Heat and moisture stress watch',
        message: `High heat with low rain is expected. Watch ${params.cropName} for stress symptoms and review irrigation plans.`,
        severity: 'MEDIUM',
      });
    }

    for (const alert of alerts) {
      const existingAlert = await this.prisma.alert.findFirst({
        where: {
          userId: params.userId,
          cropSeasonId: params.cropSeasonId,
          title: alert.title,
          createdAt: {
            gte: addDays(new Date(), -1),
          },
        },
      });

      if (existingAlert) {
        continue;
      }

      const created = await this.prisma.alert.create({
        data: {
          userId: params.userId,
          cropSeasonId: params.cropSeasonId,
          title: alert.title,
          message: alert.message,
          alertType: 'WEATHER',
          severity: alert.severity,
        },
      });

      this.notificationsService.publishInternalEvent('alert.created', {
        alertId: created.id,
        userId: params.userId,
        cropSeasonId: params.cropSeasonId,
      });
    }
  }

  @Cron('0 4 * * *')
  async refreshActiveSeasonsNightly() {
    const activeSeasons = await this.prisma.cropSeason.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, farmPlot: true, cropName: true },
    });

    for (const season of activeSeasons) {
      const refreshedSeason = await this.syncSeasonLifecycle(season.id);

      if (!refreshedSeason?.farmPlot) {
        continue;
      }

      const weather = await this.weatherService.getWeatherForFarmPlot(
        refreshedSeason.farmPlot,
      );

      await this.applyWeatherAlerts({
        userId: refreshedSeason.farmPlot.userId,
        cropSeasonId: season.id,
        cropName: refreshedSeason.cropName,
        currentStage: refreshedSeason.currentStage,
        weather,
        irrigationType: refreshedSeason.farmPlot.irrigationType,
      });
    }
  }
}
