import { Injectable } from '@nestjs/common';

import { endOfWindow, startOfToday } from '../common/utils/date.util';
import { PrismaService } from '../prisma/prisma.service';
import { RulesEngineService } from '../rules-engine/rules-engine.service';
import { presentUser } from '../users/user.presenter';
import { WeatherService } from '../weather/weather.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesEngineService: RulesEngineService,
    private readonly weatherService: WeatherService,
  ) {}

  async getWeeklyDashboard(
    userId: string,
    locationOverride?: { latitude: number; longitude: number },
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const seasons = await this.prisma.cropSeason.findMany({
      where: {
        status: 'ACTIVE',
        farmPlot: {
          userId,
        },
      },
      include: {
        farmPlot: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const seasonSummaries = await Promise.all(
      seasons.map(async (season) => {
        const refreshedSeason =
          await this.rulesEngineService.syncSeasonLifecycle(season.id);
        const weather = refreshedSeason?.farmPlot
          ? await this.weatherService.getWeatherForFarmPlot(
              refreshedSeason.farmPlot,
              locationOverride,
            )
          : null;

        if (refreshedSeason?.farmPlot && weather) {
          await this.rulesEngineService.applyWeatherAlerts({
            userId,
            cropSeasonId: season.id,
            cropName: refreshedSeason.cropName,
            currentStage: refreshedSeason.currentStage,
            weather,
            irrigationType: refreshedSeason.farmPlot.irrigationType,
          });
        }

        const tasks = await this.prisma.cropTask.findMany({
          where: {
            cropSeasonId: season.id,
            OR: [
              {
                dueDate: {
                  lte: endOfWindow(7),
                },
                status: {
                  in: ['PENDING', 'OVERDUE'],
                },
              },
              { status: 'OVERDUE' },
            ],
          },
          orderBy: [{ dueDate: 'asc' }],
        });

        const alerts = await this.prisma.alert.findMany({
          where: {
            userId,
            cropSeasonId: season.id,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });

        return {
          cropSeasonId: season.id,
          cropName: refreshedSeason?.cropName ?? season.cropName,
          sowingDate: season.sowingDate.toISOString(),
          currentStage: refreshedSeason?.currentStage ?? season.currentStage,
          farmPlotName: season.farmPlot.name,
          tasks: tasks.map((task) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            dueDate: task.dueDate.toISOString(),
            taskType: task.taskType,
            priority: task.priority,
            status: task.status,
          })),
          alerts,
          weather: weather
            ? {
                ...weather,
                advisories: refreshedSeason?.farmPlot
                  ? this.rulesEngineService.buildWeatherAdvisories({
                      weather,
                      cropName: season.cropName,
                      currentStage: refreshedSeason.currentStage,
                      irrigationType: refreshedSeason.farmPlot.irrigationType,
                    })
                  : weather.advisories,
              }
            : null,
        };
      }),
    );

    return {
      user: presentUser(user),
      generatedAt: startOfToday().toISOString(),
      seasons: seasonSummaries,
    };
  }
}
