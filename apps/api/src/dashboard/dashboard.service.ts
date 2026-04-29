import { Injectable } from '@nestjs/common';
import type { CropSeason, FarmPlot, Scheme } from '../generated/prisma';

import { diffInDays, endOfWindow, startOfToday } from '../common/utils/date.util';
import { haversineDistanceKm } from '../common/utils/geo.util';
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
    selectedCropSeasonId?: string,
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

    if (!seasons.length) {
      return {
        user: presentUser(user),
        generatedAt: startOfToday().toISOString(),
        featuredSeason: null,
        seasonSwitcher: [],
        weatherHero: null,
        taskFocus: null,
        cropHealth: null,
        marketPulse: null,
        schemeSpotlight: null,
        resourcePulse: null,
        offlineState: {
          weatherCacheReady: false,
          latestWeatherAt: null,
          latestAlertAt: null,
          message:
            'No active crop season is set yet. Add a crop to unlock your weekly farm feed.',
        },
      };
    }

    const refreshedSeasons = (
      await Promise.all(
        seasons.map((season) => this.rulesEngineService.syncSeasonLifecycle(season.id)),
      )
    ).filter((season): season is NonNullable<typeof season> => Boolean(season));

    const featuredSeason =
      refreshedSeasons.find((season) => season.id === selectedCropSeasonId) ??
      refreshedSeasons[0];

    const weatherHero = await this.weatherService.getWeatherForFarmPlot(
      featuredSeason.farmPlot,
      locationOverride,
    );

    await this.rulesEngineService.applyWeatherAlerts({
      userId,
      cropSeasonId: featuredSeason.id,
      cropName: featuredSeason.cropName,
      currentStage: featuredSeason.currentStage,
      weather: weatherHero,
      irrigationType: featuredSeason.farmPlot.irrigationType,
    });

    const [tasks, completedCount, latestDiseaseReport, latestAlert, cachedSnapshot] =
      await Promise.all([
        this.prisma.cropTask.findMany({
          where: {
            cropSeasonId: featuredSeason.id,
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
          take: 6,
        }),
        this.prisma.cropTask.count({
          where: {
            cropSeasonId: featuredSeason.id,
            status: 'COMPLETED',
          },
        }),
        this.prisma.diseaseReport.findFirst({
          where: {
            userId,
            cropSeasonId: featuredSeason.id,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.alert.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.weatherSnapshot.findFirst({
          where: {
            farmPlotId: featuredSeason.farmPlotId,
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    const pendingCount = tasks.filter((task) =>
      ['PENDING', 'OVERDUE'].includes(task.status),
    ).length;
    const marketPulse = await this.buildMarketPulse(featuredSeason.farmPlot, featuredSeason);
    const schemeSpotlight = await this.buildSchemeSpotlight(
      userId,
      featuredSeason.cropName,
      user.state,
    );
    const resourcePulse = buildResourcePulse(featuredSeason, weatherHero);

    return {
      user: presentUser(user),
      generatedAt: new Date().toISOString(),
      featuredSeason: {
        cropSeasonId: featuredSeason.id,
        cropName: featuredSeason.cropName,
        sowingDate: featuredSeason.sowingDate.toISOString(),
        currentStage: featuredSeason.currentStage,
        farmPlotId: featuredSeason.farmPlotId,
        farmPlotName: featuredSeason.farmPlot.name,
        village: featuredSeason.farmPlot.village,
        district: featuredSeason.farmPlot.district,
        state: featuredSeason.farmPlot.state,
        irrigationType: featuredSeason.farmPlot.irrigationType,
        stageProgressPercent: computeStageProgressPercent(featuredSeason),
        daysSinceSowing: Math.max(
          0,
          diffInDays(new Date(featuredSeason.sowingDate), new Date()),
        ),
      },
      seasonSwitcher: refreshedSeasons.map((season) => ({
        cropSeasonId: season.id,
        cropName: season.cropName,
        currentStage: season.currentStage,
        farmPlotName: season.farmPlot.name,
        locationLabel: `${season.farmPlot.village}, ${season.farmPlot.district}`,
        stageProgressPercent: computeStageProgressPercent(season),
        pendingTaskCount: season.tasks.filter((task) =>
          ['PENDING', 'OVERDUE'].includes(task.status),
        ).length,
        hasWeather: true,
      })),
      weatherHero,
      taskFocus: {
        title: 'This week in the field',
        subtitle: `${pendingCount} actions need attention for ${featuredSeason.cropName}.`,
        progressLabel:
          completedCount > 0
            ? `${completedCount} tasks already completed this season`
            : 'No completed tasks logged yet this season',
        pendingCount,
        completedCount,
        tasks: tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          dueDate: task.dueDate.toISOString(),
          taskType: task.taskType,
          priority: task.priority,
          status: task.status,
        })),
      },
      cropHealth: buildCropHealthSummary(latestDiseaseReport),
      marketPulse,
      schemeSpotlight,
      resourcePulse,
      offlineState: {
        weatherCacheReady: Boolean(cachedSnapshot),
        latestWeatherAt: cachedSnapshot?.createdAt.toISOString() ?? null,
        latestAlertAt: latestAlert?.createdAt.toISOString() ?? null,
        message: cachedSnapshot
          ? 'Saved weather guidance is available for this plot if the network drops.'
          : 'This plot currently depends on live weather retrieval.',
      },
    };
  }

  private async buildMarketPulse(farmPlot: FarmPlot, season: CropSeason) {
    const records = await this.prisma.marketRecord.findMany({
      where: {
        cropName: {
          contains: season.cropName,
          mode: 'insensitive',
        },
        state: {
          equals: farmPlot.state,
          mode: 'insensitive',
        },
      },
      include: {
        facility: true,
      },
      orderBy: [{ recordDate: 'desc' }, { priceModal: 'desc' }],
      take: 10,
    });

    const bestRecord = records[0];
    if (!bestRecord) {
      return null;
    }

    const previousRecord = await this.prisma.marketRecord.findFirst({
      where: {
        cropName: {
          contains: season.cropName,
          mode: 'insensitive',
        },
        mandiName: bestRecord.mandiName,
        state: {
          equals: bestRecord.state,
          mode: 'insensitive',
        },
        recordDate: {
          lt: bestRecord.recordDate,
        },
      },
      orderBy: [{ recordDate: 'desc' }],
    });

    const delta =
      previousRecord != null
        ? Number((bestRecord.priceModal - previousRecord.priceModal).toFixed(0))
        : null;
    const trendDirection =
      delta == null || Math.abs(delta) < 10 ? 'STABLE' : delta > 0 ? 'UP' : 'DOWN';
    const distanceKm =
      farmPlot.latitude != null &&
      farmPlot.longitude != null &&
      bestRecord.facility?.latitude != null &&
      bestRecord.facility?.longitude != null
        ? Number(
            haversineDistanceKm(
              { latitude: farmPlot.latitude, longitude: farmPlot.longitude },
              {
                latitude: bestRecord.facility.latitude,
                longitude: bestRecord.facility.longitude,
              },
            ).toFixed(1),
          )
        : null;

    return {
      cropName: season.cropName,
      modalPrice: bestRecord.priceModal,
      mandiName: bestRecord.mandiName,
      distanceKm,
      trendDirection,
      trendLabel:
        trendDirection === 'UP'
          ? `Up by ₹${Math.abs(delta ?? 0)} from the previous visible record`
          : trendDirection === 'DOWN'
            ? `Down by ₹${Math.abs(delta ?? 0)} from the previous visible record`
            : 'Price trend looks stable in recent visible records',
      freshnessLabel: formatFreshnessLabel(bestRecord.recordDate),
      summary:
        distanceKm != null
          ? `${bestRecord.mandiName} is showing the strongest visible price about ${distanceKm} km away.`
          : `${bestRecord.mandiName} is showing the strongest visible price in your market feed.`,
      ctaLabel: 'Compare mandi prices',
    };
  }

  private async buildSchemeSpotlight(
    userId: string,
    cropName: string,
    state?: string | null,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        village: true,
        district: true,
      },
    });

    const schemes = await this.prisma.scheme.findMany({
      where: {
        active: true,
        OR: [{ applicableState: 'ALL' }, ...(state ? [{ applicableState: state }] : [])],
      },
      orderBy: [{ updatedAt: 'desc' }, { title: 'asc' }],
      take: 8,
    });

    const spotlight = pickRelevantScheme(schemes, cropName, state);
    if (!spotlight) {
      return null;
    }

    return {
      schemeId: spotlight.id,
      title: spotlight.title,
      benefitSummary: buildSchemeBenefitSummary(spotlight),
      priority: inferSchemePriority(spotlight, cropName),
      whyRelevant: buildSchemeWhyRelevant(spotlight, cropName, state, user?.district),
      officialLink: spotlight.officialLink,
      ctaLabel: 'Open scheme details',
    };
  }
}

function computeStageProgressPercent(
  season: CropSeason & {
    cropDefinition?: {
      stageRules: Array<{ startDay: number; endDay: number; labelEn: string }>;
    };
  },
) {
  const daysSinceSowing = Math.max(0, diffInDays(new Date(season.sowingDate), new Date()));
  const stageRules = season.cropDefinition?.stageRules ?? [];
  const currentRule =
    stageRules.find((rule) => rule.labelEn === season.currentStage) ?? stageRules.at(-1);
  const totalWindow = Math.max(1, stageRules.at(-1)?.endDay ?? 120);

  if (!currentRule) {
    return Math.min(100, Math.round((daysSinceSowing / totalWindow) * 100));
  }

  const stageMidpoint = Math.max(currentRule.endDay, daysSinceSowing);
  return Math.min(100, Math.round((stageMidpoint / totalWindow) * 100));
}

function buildCropHealthSummary(
  latestDiseaseReport: {
    id: string;
    predictedIssue: string | null;
    confidenceScore: number;
    escalationRequired: boolean;
    recommendation: string;
  } | null,
) {
  if (!latestDiseaseReport) {
    return {
      riskLevel: 'LOW' as const,
      headline: 'No recent crop issue logged',
      detail: 'Keep scouting the field and upload photos quickly if new stress appears.',
      confidenceBand: null,
      latestReportId: null,
      ctaLabel: 'Diagnose crop problem',
    };
  }

  const confidenceBand =
    latestDiseaseReport.confidenceScore >= 0.75
      ? 'HIGH'
      : latestDiseaseReport.confidenceScore >= 0.45
        ? 'MEDIUM'
        : 'LOW';

  return {
    riskLevel: latestDiseaseReport.escalationRequired ? 'HIGH' : 'MEDIUM',
    headline:
      latestDiseaseReport.predictedIssue ?? 'Recent crop issue needs review',
    detail: latestDiseaseReport.recommendation,
    confidenceBand,
    latestReportId: latestDiseaseReport.id,
    ctaLabel: latestDiseaseReport.escalationRequired
      ? 'Ask expert help'
      : 'Review crop advisory',
  };
}

function buildResourcePulse(
  season: CropSeason & { farmPlot: FarmPlot },
  weather: {
    current: {
      rainfallExpectedMm: number;
      temperatureC: number;
    };
    fieldWindows: {
      irrigationWindow: {
        summary: string;
      };
    };
  },
) {
  const weeklyWaterMm = Math.max(
    6,
    season.farmPlot.irrigationType === 'RAIN_FED'
      ? 28 - weather.current.rainfallExpectedMm
      : 22 - weather.current.rainfallExpectedMm * 0.6,
  );
  const fertilizerNeed = /flower|fruit|grain|pod/i.test(season.currentStage)
    ? 'Use only stage-relevant top dressing and avoid rush application before rain.'
    : 'Stay with the stage schedule and split applications if the soil stays wet.';
  const pesticideNeedLevel =
    weather.current.rainfallExpectedMm >= 18
      ? 'WATCH'
      : weather.current.temperatureC >= 35
        ? 'WATCH'
        : 'LOW';

  return {
    weeklyWaterMm: Number(weeklyWaterMm.toFixed(1)),
    fertilizerNeed,
    pesticideNeedLevel,
    recommendations: [
      weather.fieldWindows.irrigationWindow.summary,
      'Scout the crop before buying any new input.',
      'Match field work to the current crop stage rather than fixed calendar habit.',
    ],
    safetyNote:
      'This is an action guide, not a guaranteed prescription. Check local field conditions before applying water or inputs.',
  };
}

function pickRelevantScheme(
  schemes: Scheme[],
  cropName: string,
  state?: string | null,
) {
  const normalizedCrop = cropName.trim().toLowerCase();

  return (
    schemes.find((scheme) =>
      scheme.relatedCrops.some((value) => value.toLowerCase() === normalizedCrop),
    ) ??
    schemes.find((scheme) => scheme.applicableState === state) ??
    schemes[0] ??
    null
  );
}

function buildSchemeBenefitSummary(scheme: Scheme) {
  const text = scheme.description.trim();
  return text.length > 140 ? `${text.slice(0, 137).trim()}...` : text;
}

function inferSchemePriority(scheme: Scheme, cropName: string) {
  const haystack = `${scheme.title} ${scheme.description} ${scheme.category}`.toLowerCase();
  const normalizedCrop = cropName.toLowerCase();

  if (
    /insurance|loss|pmfby|credit|loan|subsidy/.test(haystack) ||
    scheme.relatedCrops.some((value) => value.toLowerCase() === normalizedCrop)
  ) {
    return 'HIGH' as const;
  }

  if (/soil|card|training|market/.test(haystack)) {
    return 'MEDIUM' as const;
  }

  return 'LOW' as const;
}

function buildSchemeWhyRelevant(
  scheme: Scheme,
  cropName: string,
  state?: string | null,
  district?: string | null,
) {
  if (scheme.relatedCrops.some((value) => value.toLowerCase() === cropName.toLowerCase())) {
    return `This scheme already mentions ${cropName}, so it may fit your current season more closely.`;
  }

  if (scheme.applicableState === state) {
    return district
      ? `This scheme is available in ${state} and may support farmers around ${district}.`
      : `This scheme is available in ${state}, so it is worth checking your eligibility.`;
  }

  return 'This scheme is broadly available and may still help with your current farm decisions.';
}

function formatFreshnessLabel(recordDate: Date) {
  const days = Math.max(0, diffInDays(recordDate, new Date()));

  if (days === 0) {
    return 'Updated today';
  }

  if (days === 1) {
    return 'Updated yesterday';
  }

  return `Updated ${days} days ago`;
}
