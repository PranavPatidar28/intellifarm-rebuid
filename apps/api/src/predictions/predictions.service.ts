import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { CropSeason, FarmPlot, SoilType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RulesEngineService } from '../rules-engine/rules-engine.service';
import { WeatherService } from '../weather/weather.service';
import {
  PREDICTION_PROVIDER,
  type PredictionProvider,
} from './prediction-provider';
import { SeasonClimateService } from './season-climate.service';
import { SoilProfileResolver } from './soil-profile.resolver';

type SoilMetrics = {
  n?: number;
  p?: number;
  k?: number;
  ph?: number;
};

type SeasonProfile = {
  seasonKey: 'KHARIF' | 'RABI' | 'ZAID' | 'CUSTOM';
  sowingMonth: number;
};

type ExplorerContext = {
  state: string;
  district?: string;
  village?: string;
  irrigationType: 'RAIN_FED' | 'DRIP' | 'SPRINKLER' | 'FLOOD' | 'MANUAL';
  latitude?: number;
  longitude?: number;
};

@Injectable()
export class PredictionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly weatherService: WeatherService,
    private readonly rulesEngineService: RulesEngineService,
    private readonly seasonClimateService: SeasonClimateService,
    private readonly soilProfileResolver: SoilProfileResolver,
    @Inject(PREDICTION_PROVIDER)
    private readonly predictionProvider: PredictionProvider,
  ) {}

  async predictCropSuggestions(
    userId: string,
    payload: {
      farmPlotId?: string;
      explorerContext?: ExplorerContext;
      seasonProfile: SeasonProfile;
      soilType?: SoilType;
      soilMetrics?: SoilMetrics;
      latitude?: number;
      longitude?: number;
      weatherOverride?: {
        currentTemperatureC?: number;
        rainfallExpectedMm?: number;
        humidityPercent?: number;
      };
    },
  ) {
    const farmPlot = payload.farmPlotId
      ? await this.prisma.farmPlot.findFirst({
          where: {
            id: payload.farmPlotId,
            userId,
          },
        })
      : null;

    if (payload.farmPlotId && !farmPlot) {
      throw new NotFoundException('Farm plot not found');
    }

    const effectiveContext = farmPlot
      ? {
          farmPlotId: farmPlot.id,
          state: farmPlot.state,
          district: farmPlot.district,
          village: farmPlot.village,
          irrigationType: farmPlot.irrigationType,
          latitude: farmPlot.latitude,
          longitude: farmPlot.longitude,
          savedSoilType: farmPlot.soilType,
        }
      : {
          farmPlotId: null,
          state: payload.explorerContext?.state ?? '',
          district: payload.explorerContext?.district,
          village: payload.explorerContext?.village,
          irrigationType: payload.explorerContext?.irrigationType ?? 'MANUAL',
          latitude: payload.explorerContext?.latitude,
          longitude: payload.explorerContext?.longitude,
          savedSoilType: null,
        };

    const cropCatalog = await this.prisma.cropDefinition.findMany({
      where: { active: true },
      orderBy: { nameEn: 'asc' },
    });

    const soilProfile = this.soilProfileResolver.resolve({
      soilMetrics: payload.soilMetrics,
      soilType: payload.soilType,
      savedSoilType: effectiveContext.savedSoilType,
    });

    const seasonClimate = await this.seasonClimateService.getSeasonClimate({
      state: effectiveContext.state,
      district: effectiveContext.district,
      village: effectiveContext.village,
      latitude: effectiveContext.latitude,
      longitude: effectiveContext.longitude,
      locationOverride:
        payload.latitude != null && payload.longitude != null
          ? {
              latitude: payload.latitude,
              longitude: payload.longitude,
            }
          : undefined,
      seasonProfile: payload.seasonProfile,
    });

    const weather = {
      currentTemperatureC:
        payload.weatherOverride?.currentTemperatureC ??
        seasonClimate.averageTempC,
      humidityPercent:
        payload.weatherOverride?.humidityPercent ??
        seasonClimate.averageHumidityPercent,
      rainfallExpectedMm:
        payload.weatherOverride?.rainfallExpectedMm ??
        seasonClimate.totalRainfallMm,
    };

    const suggestions = await this.predictionProvider.predictCropSuggestions({
      farmPlot: {
        irrigationType: effectiveContext.irrigationType,
        state: effectiveContext.state,
      },
      cropCatalog: cropCatalog.map((crop) => ({
        slug: crop.slug,
        nameEn: crop.nameEn,
      })),
      soilMetrics: soilProfile.soilMetrics,
      weather,
    });

    const assumptions = dedupeAssumptions([
      ...soilProfile.assumptions,
      ...seasonClimate.assumptions,
      `Predictions are matched to ${formatSeasonSummary(payload.seasonProfile)}.`,
    ]);

    const prediction = await this.prisma.predictionRun.create({
      data: {
        userId,
        farmPlotId: effectiveContext.farmPlotId,
        type: 'CROP_SUGGESTION',
        provider: this.predictionProvider.providerName,
        status: 'COMPLETED',
        inputJson: {
          farmPlotId: effectiveContext.farmPlotId,
          explorerContext: payload.explorerContext ?? null,
          soilType: payload.soilType ?? null,
          soilMetrics: payload.soilMetrics ?? null,
          latitude: payload.latitude ?? null,
          longitude: payload.longitude ?? null,
          seasonProfile: payload.seasonProfile,
          weatherOverride: payload.weatherOverride ?? null,
        },
        outputJson: {
          suggestions,
          weather,
          inputConfidence: soilProfile.inputConfidence,
          soilProfile: {
            soilType: soilProfile.soilType,
            source: soilProfile.source,
            summary: soilProfile.summary,
          },
          seasonClimate: {
            method: seasonClimate.method,
            averageTempC: seasonClimate.averageTempC,
            averageHumidityPercent: seasonClimate.averageHumidityPercent,
            totalRainfallMm: seasonClimate.totalRainfallMm,
            label: seasonClimate.label,
            locationLabel: seasonClimate.locationLabel,
          },
          assumptions,
        },
      },
    });

    return {
      prediction: presentPredictionRun(prediction),
      suggestions,
      inputConfidence: soilProfile.inputConfidence,
      soilProfile: {
        soilType: soilProfile.soilType,
        source: soilProfile.source,
        summary: soilProfile.summary,
      },
      seasonClimate: {
        method: seasonClimate.method,
        averageTempC: seasonClimate.averageTempC,
        averageHumidityPercent: seasonClimate.averageHumidityPercent,
        totalRainfallMm: seasonClimate.totalRainfallMm,
        label: seasonClimate.label,
        locationLabel: seasonClimate.locationLabel,
      },
      assumptions,
      weather,
    };
  }

  async predictResources(
    userId: string,
    payload: {
      cropSeasonId: string;
      soilMetrics?: SoilMetrics;
      latitude?: number;
      longitude?: number;
    },
  ) {
    const season = await this.prisma.cropSeason.findFirst({
      where: {
        id: payload.cropSeasonId,
        farmPlot: {
          userId,
        },
      },
      include: {
        farmPlot: true,
        cropDefinition: {
          include: {
            stageRules: true,
          },
        },
      },
    });

    if (!season) {
      throw new NotFoundException('Crop season not found');
    }

    const syncedSeason = await this.rulesEngineService.syncSeasonLifecycle(
      season.id,
    );
    const effectiveSeason = syncedSeason ?? season;
    const weather = await this.resolveCurrentWeather(
      effectiveSeason.farmPlot,
      payload,
    );

    const resourcePrediction = await this.predictionProvider.predictResources({
      cropSeason: {
        cropName: effectiveSeason.cropName,
        currentStage: effectiveSeason.currentStage,
        irrigationType: effectiveSeason.farmPlot.irrigationType,
      },
      soilMetrics: payload.soilMetrics,
      weather,
    });

    const prediction = await this.prisma.predictionRun.create({
      data: {
        userId,
        farmPlotId: effectiveSeason.farmPlotId,
        cropSeasonId: effectiveSeason.id,
        type: 'RESOURCE_ESTIMATE',
        provider: this.predictionProvider.providerName,
        status: 'COMPLETED',
        inputJson: {
          soilMetrics: payload.soilMetrics ?? null,
          latitude: payload.latitude ?? null,
          longitude: payload.longitude ?? null,
        },
        outputJson: {
          resourcePrediction,
          weather,
        },
      },
    });

    return {
      prediction: presentPredictionRun(prediction),
      resourcePrediction,
      weather,
    };
  }

  async listPredictionRuns(
    userId: string,
    query: {
      type?: 'CROP_SUGGESTION' | 'RESOURCE_ESTIMATE';
      farmPlotId?: string;
      limit: number;
    },
  ) {
    const runs = await this.prisma.predictionRun.findMany({
      where: {
        userId,
        ...(query.type ? { type: query.type } : {}),
        ...(query.farmPlotId ? { farmPlotId: query.farmPlotId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });

    return {
      runs: runs.map((run) => ({
        id: run.id,
        type: run.type,
        provider: run.provider,
        status: run.status,
        createdAt: run.createdAt.toISOString(),
        outputJson: run.outputJson as Record<string, unknown>,
      })),
    };
  }

  private async resolveCurrentWeather(
    farmPlot: FarmPlot,
    payload: {
      latitude?: number;
      longitude?: number;
      weatherOverride?: {
        currentTemperatureC?: number;
        rainfallExpectedMm?: number;
        humidityPercent?: number;
      };
    },
  ) {
    const liveWeather = await this.weatherService.getWeatherForFarmPlot(
      farmPlot,
      payload.latitude != null && payload.longitude != null
        ? {
            latitude: payload.latitude,
            longitude: payload.longitude,
          }
        : undefined,
    );

    return {
      currentTemperatureC:
        payload.weatherOverride?.currentTemperatureC ??
        liveWeather.current.temperatureC,
      humidityPercent:
        payload.weatherOverride?.humidityPercent ??
        liveWeather.current.humidityPercent,
      rainfallExpectedMm:
        payload.weatherOverride?.rainfallExpectedMm ??
        liveWeather.current.rainfallExpectedMm,
    };
  }
}

function presentPredictionRun(
  prediction: Pick<CropSeason, never> & {
    id: string;
    type: 'CROP_SUGGESTION' | 'RESOURCE_ESTIMATE';
    provider: string;
    status: 'COMPLETED' | 'FAILED';
    createdAt: Date;
  },
) {
  return {
    id: prediction.id,
    type: prediction.type,
    provider: prediction.provider,
    status: prediction.status,
    createdAt: prediction.createdAt.toISOString(),
  };
}

function formatSeasonSummary(seasonProfile: SeasonProfile) {
  const monthLabel = new Date(
    Date.UTC(2025, seasonProfile.sowingMonth - 1, 1),
  ).toLocaleString('en-US', {
    month: 'long',
    timeZone: 'UTC',
  });
  const labels: Record<SeasonProfile['seasonKey'], string> = {
    KHARIF: 'Kharif',
    RABI: 'Rabi',
    ZAID: 'Zaid',
    CUSTOM: 'a custom season window',
  };

  if (seasonProfile.seasonKey === 'CUSTOM') {
    return `${labels[seasonProfile.seasonKey]} around ${monthLabel}`;
  }

  return `${labels[seasonProfile.seasonKey]} (${monthLabel})`;
}

function dedupeAssumptions(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}
