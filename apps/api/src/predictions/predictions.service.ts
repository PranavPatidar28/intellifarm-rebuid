import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import type { CropSeason, FarmPlot, SoilType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RulesEngineService } from '../rules-engine/rules-engine.service';
import { WeatherService } from '../weather/weather.service';
import {
  IntelliFarmMLService,
  deriveWaterAvailabilityScore,
  mapDistrictToMLApi,
  mapSeasonKeyToMLApi,
  mapSoilTypeToMLApi,
  mapWaterSupplyLevelToScore,
  type FarmerProfileRequest,
  type MLCropRecommendation,
} from './intellifarm-ml.service';
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
  farmSizeAcre?: number;
  latitude?: number;
  longitude?: number;
};

// ─── Normalized result types ─────────────────────────────────────────────────

export type CropRecommendationResult = {
  cropName: string;
  averageYieldTonnePerHectare: number;
  bestCaseYieldTonnePerHectare: number;
  worstCaseYieldTonnePerHectare: number;
  averageProfitRs: number;
  averageRevenueRs: number;
  estimatedCostRs: number;
  failureRiskPct: number;
  finalScore: number;
  ragExplanation: Array<{ heading: string; text: string }>;
  suggestion: string;
};

export type CropPredictionOutput = {
  prediction: {
    id: string;
    type: 'CROP_SUGGESTION';
    provider: string;
    status: 'COMPLETED' | 'FAILED';
    createdAt: string;
  };
  topCrops: CropRecommendationResult[];
  cropMustNotBeGrown: string | null;
  inputConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  soilProfile: {
    soilType: SoilType | null;
    source: string;
    summary: string;
  };
  seasonClimate: {
    method: string;
    averageTempC: number;
    averageHumidityPercent: number;
    totalRainfallMm: number;
    label: string;
    locationLabel: string;
  };
  assumptions: string[];
  weather: {
    currentTemperatureC: number;
    humidityPercent: number;
    rainfallExpectedMm: number;
  };
};

// ─── Resource prediction types (unchanged) ───────────────────────────────────

export type ResourcePrediction = {
  cropName: string;
  currentStage: string;
  weeklyWaterMm: number;
  fertilizerNeed: string;
  pesticideNeedLevel: 'LOW' | 'WATCH' | 'HIGH';
  recommendations: string[];
  safetyNote: string;
};

@Injectable()
export class PredictionsService {
  private readonly logger = new Logger(PredictionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly weatherService: WeatherService,
    private readonly rulesEngineService: RulesEngineService,
    private readonly seasonClimateService: SeasonClimateService,
    private readonly soilProfileResolver: SoilProfileResolver,
    private readonly mlService: IntelliFarmMLService,
  ) {}

  async predictCropSuggestions(
    userId: string,
    payload: {
      farmPlotId?: string;
      explorerContext?: ExplorerContext;
      seasonProfile: SeasonProfile;
      soilType?: SoilType;
      soilMetrics?: SoilMetrics;
      waterSupplyLevel?: string;
      latitude?: number;
      longitude?: number;
      weatherOverride?: {
        currentTemperatureC?: number;
        rainfallExpectedMm?: number;
        humidityPercent?: number;
      };
    },
  ): Promise<CropPredictionOutput> {
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
          farmSizeAcre: farmPlot.area,
        }
      : {
          farmPlotId: null,
          state: payload.explorerContext?.state ?? '',
          district: payload.explorerContext?.district ?? '',
          village: payload.explorerContext?.village,
          irrigationType: payload.explorerContext?.irrigationType ?? 'MANUAL',
          latitude: payload.explorerContext?.latitude,
          longitude: payload.explorerContext?.longitude,
          savedSoilType: null,
          farmSizeAcre: payload.explorerContext?.farmSizeAcre ?? 2.5,
        };

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

    // Build the ML API request — district must be a valid MP district for the ML model
    const rawDistrict =
      effectiveContext.district?.trim() || effectiveContext.state || '';
    const district = mapDistrictToMLApi(rawDistrict);
    const districtWasMapped =
      rawDistrict.toLowerCase() !== district.toLowerCase();
    const farmSizeAcre =
      effectiveContext.farmSizeAcre > 0 ? effectiveContext.farmSizeAcre : 2.5;

    // Derive water availability score — prefer waterSupplyLevel > irrigationType
    const waterSupplyScore = mapWaterSupplyLevelToScore(
      payload.waterSupplyLevel,
    );
    const waterScore =
      waterSupplyScore ??
      deriveWaterAvailabilityScore(effectiveContext.irrigationType);
    const waterScoreSource =
      waterSupplyScore != null
        ? `${payload.waterSupplyLevel?.toLowerCase()} water supply`
        : `${effectiveContext.irrigationType.toLowerCase().replace(/_/g, ' ')} irrigation`;

    const mlRequest: FarmerProfileRequest = {
      district,
      season: mapSeasonKeyToMLApi(payload.seasonProfile.seasonKey),
      farm_size_acre: farmSizeAcre,
      soil_type: mapSoilTypeToMLApi(
        payload.soilType ?? effectiveContext.savedSoilType,
      ),
      water_availability_score: waterScore,
      prediction_year: new Date().getFullYear(),
      // Season-averaged weather from historical archive
      rainfall:
        weather.rainfallExpectedMm >= 0 ? weather.rainfallExpectedMm : null,
      avg_temperature: weather.currentTemperatureC ?? null,
      min_temperature: seasonClimate.minTempC ?? null,
      max_temperature: seasonClimate.maxTempC ?? null,
      avg_humidity:
        weather.humidityPercent != null &&
        weather.humidityPercent >= 0 &&
        weather.humidityPercent <= 100
          ? weather.humidityPercent
          : null,
      soil_ph:
        soilProfile.soilMetrics.ph != null &&
        soilProfile.soilMetrics.ph >= 0 &&
        soilProfile.soilMetrics.ph <= 14
          ? soilProfile.soilMetrics.ph
          : null,
      N: soilProfile.soilMetrics.n >= 0 ? soilProfile.soilMetrics.n : null,
      P: soilProfile.soilMetrics.p >= 0 ? soilProfile.soilMetrics.p : null,
      K: soilProfile.soilMetrics.k >= 0 ? soilProfile.soilMetrics.k : null,
    };

    this.logger.log(
      `Running crop prediction for district=${district}, season=${mlRequest.season}`,
    );

    const mlResponse = await this.mlService.predictCrops(mlRequest);

    const topCrops = mlResponse.top_3_crops.map(mapMLCropToResult);

    const assumptions = dedupeAssumptions([
      ...soilProfile.assumptions,
      ...seasonClimate.assumptions,
      ...(districtWasMapped
        ? [
            `Your district "${rawDistrict}" is not directly covered by the ML model. Predictions are approximated using ${district} (Madhya Pradesh) as a reference.`,
          ]
        : []),
      `Predictions are matched to ${formatSeasonSummary(payload.seasonProfile)}.`,
      `Farm size used: ${farmSizeAcre} acres.`,
      `Water availability score: ${waterScore} (based on ${waterScoreSource}).`,
    ]);

    const prediction = await this.prisma.predictionRun.create({
      data: {
        userId,
        farmPlotId: effectiveContext.farmPlotId,
        type: 'CROP_SUGGESTION',
        provider: 'intellifarm-ml-api',
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
          mlApiRequest: mlRequest,
        },
        outputJson: {
          topCrops,
          cropMustNotBeGrown: mlResponse.crop_must_not_be_grown,
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
      topCrops,
      cropMustNotBeGrown: mlResponse.crop_must_not_be_grown,
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

    const resourcePrediction = buildMockResourcePrediction({
      cropName: effectiveSeason.cropName,
      currentStage: effectiveSeason.currentStage,
      irrigationType: effectiveSeason.farmPlot.irrigationType,
      soilMetrics: payload.soilMetrics,
      weather,
    });

    const prediction = await this.prisma.predictionRun.create({
      data: {
        userId,
        farmPlotId: effectiveSeason.farmPlotId,
        cropSeasonId: effectiveSeason.id,
        type: 'RESOURCE_ESTIMATE',
        provider: 'intellifarm-local-mock',
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

// ─── Mapping helpers ─────────────────────────────────────────────────────────

function mapMLCropToResult(
  crop: MLCropRecommendation,
): CropRecommendationResult {
  return {
    cropName: crop.crop_name,
    averageYieldTonnePerHectare: round2(crop.average_yield_tonne_per_hectare),
    bestCaseYieldTonnePerHectare: round2(
      crop.best_case_yield_tonne_per_hectare,
    ),
    worstCaseYieldTonnePerHectare: round2(
      crop.worst_case_yield_tonne_per_hectare,
    ),
    averageProfitRs: Math.round(crop.average_profit_rs),
    averageRevenueRs: Math.round(crop.average_revenue_rs),
    estimatedCostRs: Math.round(crop.estimated_cost_rs),
    failureRiskPct: round1(crop.failure_risk_pct),
    finalScore: round1(crop.final_score),
    ragExplanation: crop.rag_explanation.summary,
    suggestion: crop.suggestion,
  };
}

// ─── Mock resource prediction (unchanged) ────────────────────────────────────

function buildMockResourcePrediction(input: {
  cropName: string;
  currentStage: string;
  irrigationType: string;
  soilMetrics?: SoilMetrics;
  weather: {
    currentTemperatureC: number;
    humidityPercent: number;
    rainfallExpectedMm: number;
  };
}): ResourcePrediction {
  const cropName = input.cropName.toLowerCase();
  const rainfall = input.weather.rainfallExpectedMm;
  const temperature = input.weather.currentTemperatureC;

  const baseWaterMm = cropName.includes('paddy')
    ? 65
    : cropName.includes('cotton')
      ? 45
      : 35;

  const stageAdjustment = /flower|grain|boll/i.test(input.currentStage)
    ? 1.2
    : /establishment/i.test(input.currentStage)
      ? 0.85
      : 1;

  const weatherAdjustment =
    rainfall >= 18 ? 0.65 : temperature >= 34 ? 1.25 : 1;

  const irrigationAdjustment = input.irrigationType === 'DRIP' ? 0.85 : 1;

  const weeklyWaterMm = Math.max(
    12,
    Math.round(
      baseWaterMm * stageAdjustment * weatherAdjustment * irrigationAdjustment,
    ),
  );

  const n = input.soilMetrics?.n ?? 0;
  const p = input.soilMetrics?.p ?? 0;
  const k = input.soilMetrics?.k ?? 0;
  const fertilitySignal = n + p + k;

  const fertilizerNeed =
    fertilitySignal >= 180
      ? 'Low to medium top-up likely'
      : fertilitySignal >= 90
        ? 'Medium top-up likely'
        : 'High probability of needing local nutrient review';

  const pesticideNeedLevel: ResourcePrediction['pesticideNeedLevel'] =
    rainfall >= 15 || temperature >= 34
      ? 'WATCH'
      : cropName.includes('cotton')
        ? 'WATCH'
        : 'LOW';

  const recommendations = [
    `Plan for about ${weeklyWaterMm} mm water this week, then adjust after checking field moisture.`,
    rainfall >= 15
      ? 'Rain is expected soon, so delay non-urgent sprays and re-check the field after the event.'
      : 'Use field scouting before any input decision, especially when the crop looks uneven.',
    fertilizerNeed,
  ];

  return {
    cropName: input.cropName,
    currentStage: input.currentStage,
    weeklyWaterMm,
    fertilizerNeed,
    pesticideNeedLevel,
    recommendations,
    safetyNote:
      'This is a planning estimate, not a chemical prescription. Confirm fertilizer or pesticide decisions with local agronomy advice and field scouting.',
  };
}

// ─── Utility functions ───────────────────────────────────────────────────────

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
    type: prediction.type as 'CROP_SUGGESTION',
    provider: prediction.provider,
    status: prediction.status as 'COMPLETED',
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

function round1(value: number) {
  return Number(value.toFixed(1));
}

function round2(value: number) {
  return Number(value.toFixed(2));
}
