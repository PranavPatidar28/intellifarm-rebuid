import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type BasePredictionContext = {
  weather: {
    currentTemperatureC: number;
    humidityPercent: number;
    rainfallExpectedMm: number;
  };
  soilMetrics?: {
    n?: number;
    p?: number;
    k?: number;
    ph?: number;
  };
};

export type CropSuggestionRequest = BasePredictionContext & {
  farmPlot: {
    irrigationType: 'RAIN_FED' | 'DRIP' | 'SPRINKLER' | 'FLOOD' | 'MANUAL';
    state: string;
  };
  cropCatalog: Array<{
    slug: string;
    nameEn: string;
  }>;
};

export type ResourcePredictionRequest = BasePredictionContext & {
  cropSeason: {
    cropName: string;
    currentStage: string;
    irrigationType: 'RAIN_FED' | 'DRIP' | 'SPRINKLER' | 'FLOOD' | 'MANUAL';
  };
};

export type CropSuggestion = {
  cropName: string;
  score: number;
  rationale: string;
};

export type ResourcePrediction = {
  cropName: string;
  currentStage: string;
  weeklyWaterMm: number;
  fertilizerNeed: string;
  pesticideNeedLevel: 'LOW' | 'WATCH' | 'HIGH';
  recommendations: string[];
  safetyNote: string;
};

export interface PredictionProvider {
  readonly providerName: string;
  predictCropSuggestions(
    input: CropSuggestionRequest,
  ): Promise<CropSuggestion[]>;
  predictResources(
    input: ResourcePredictionRequest,
  ): Promise<ResourcePrediction>;
}

export const PREDICTION_PROVIDER = Symbol('PREDICTION_PROVIDER');

@Injectable()
export class MockPredictionProvider implements PredictionProvider {
  readonly providerName = 'mock-prediction-provider';

  predictCropSuggestions(input: CropSuggestionRequest) {
    return Promise.resolve(
      input.cropCatalog
        .map((crop) => buildCropSuggestion(crop.nameEn, input))
        .sort((left, right) => right.score - left.score)
        .slice(0, 3),
    );
  }

  predictResources(
    input: ResourcePredictionRequest,
  ): Promise<ResourcePrediction> {
    const cropName = input.cropSeason.cropName.toLowerCase();
    const currentStage = input.cropSeason.currentStage;
    const rainfall = input.weather.rainfallExpectedMm;
    const temperature = input.weather.currentTemperatureC;
    const baseWaterMm = cropName.includes('paddy')
      ? 65
      : cropName.includes('cotton')
        ? 45
        : 35;
    const stageAdjustment = /flower|grain|boll/i.test(currentStage)
      ? 1.2
      : /establishment/i.test(currentStage)
        ? 0.85
        : 1;
    const weatherAdjustment =
      rainfall >= 18 ? 0.65 : temperature >= 34 ? 1.25 : 1;
    const irrigationAdjustment =
      input.cropSeason.irrigationType === 'DRIP' ? 0.85 : 1;
    const weeklyWaterMm = Math.max(
      12,
      Math.round(
        baseWaterMm *
          stageAdjustment *
          weatherAdjustment *
          irrigationAdjustment,
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

    return Promise.resolve({
      cropName: input.cropSeason.cropName,
      currentStage,
      weeklyWaterMm,
      fertilizerNeed,
      pesticideNeedLevel,
      recommendations,
      safetyNote:
        'This is a planning estimate, not a chemical prescription. Confirm fertilizer or pesticide decisions with local agronomy advice and field scouting.',
    });
  }
}

@Injectable()
export class HttpPredictionProvider implements PredictionProvider {
  readonly providerName = 'http-prediction-provider';

  constructor(private readonly configService: ConfigService) {}

  async predictCropSuggestions(input: CropSuggestionRequest) {
    const response = await this.post('/crop-suggestions', input);
    const suggestions = Array.isArray(response.suggestions)
      ? response.suggestions
      : [];

    return suggestions
      .map((suggestion) => normalizeCropSuggestion(suggestion))
      .filter((suggestion): suggestion is CropSuggestion => suggestion != null)
      .slice(0, 3);
  }

  async predictResources(input: ResourcePredictionRequest) {
    const response = await this.post('/resources', input);
    const normalized = normalizeResourcePrediction(response);

    if (!normalized) {
      throw new Error(
        'Prediction provider returned an invalid resource prediction',
      );
    }

    return normalized;
  }

  private async post(path: string, payload: unknown) {
    const baseUrl = this.configService.get<string>('PREDICTION_PROVIDER_URL');
    const apiKey = this.configService.get<string>(
      'PREDICTION_PROVIDER_API_KEY',
    );

    if (!baseUrl) {
      throw new Error('Prediction provider URL is not configured');
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Prediction provider failed with ${response.status}`);
    }

    return (await response.json()) as Record<string, unknown>;
  }
}

@Injectable()
export class RailwayCropPredictionProvider implements PredictionProvider {
  readonly providerName = 'railway-crop-prediction-provider';

  constructor(
    private readonly configService: ConfigService,
    private readonly mockPredictionProvider: MockPredictionProvider,
  ) {}

  async predictCropSuggestions(input: CropSuggestionRequest) {
    const { payload, defaultedFields } = buildRailwayPredictionPayload(input);
    const response = await this.postPredict(payload);
    const liveSuggestions = normalizeRailwaySuggestions(
      response,
      input.cropCatalog,
      defaultedFields,
    );

    if (liveSuggestions.length >= 3) {
      return liveSuggestions.slice(0, 3);
    }

    const fallbackSuggestions =
      await this.mockPredictionProvider.predictCropSuggestions(input);

    return mergeCropSuggestions(liveSuggestions, fallbackSuggestions);
  }

  predictResources(input: ResourcePredictionRequest) {
    return this.mockPredictionProvider.predictResources(input);
  }

  private async postPredict(payload: Record<string, number>) {
    const baseUrl = this.configService.get<string>('PREDICTION_PROVIDER_URL');
    const apiKey = this.configService.get<string>(
      'PREDICTION_PROVIDER_API_KEY',
    );

    if (!baseUrl) {
      throw new Error('Prediction provider URL is not configured');
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Prediction provider failed with ${response.status}`);
    }

    return (await response.json()) as Record<string, unknown>;
  }
}

function buildCropSuggestion(
  cropName: string,
  input: CropSuggestionRequest,
): CropSuggestion {
  const normalizedCropName = cropName.toLowerCase();
  const rainfall = input.weather.rainfallExpectedMm;
  const temperature = input.weather.currentTemperatureC;
  const ph = input.soilMetrics?.ph;

  let score = 0.55;
  const rationaleParts = [
    'Based on weather-linked suitability and the available soil inputs.',
  ];

  if (normalizedCropName.includes('wheat')) {
    if (temperature >= 18 && temperature <= 30) score += 0.16;
    if (rainfall <= 12) score += 0.08;
    if (ph != null && ph >= 6 && ph <= 7.8) score += 0.06;
    rationaleParts.push(
      'Wheat generally suits moderate temperatures and lower short-term rainfall.',
    );
  } else if (normalizedCropName.includes('paddy')) {
    if (rainfall >= 12) score += 0.18;
    if (
      input.farmPlot.irrigationType === 'FLOOD' ||
      input.farmPlot.irrigationType === 'RAIN_FED'
    ) {
      score += 0.08;
    }
    if (ph != null && ph >= 5.5 && ph <= 7.5) score += 0.05;
    rationaleParts.push(
      'Paddy gets a higher score when water availability or rainfall looks supportive.',
    );
  } else if (normalizedCropName.includes('cotton')) {
    if (temperature >= 24 && temperature <= 35) score += 0.16;
    if (rainfall >= 5 && rainfall <= 18) score += 0.08;
    if (ph != null && ph >= 5.8 && ph <= 8) score += 0.05;
    rationaleParts.push(
      'Cotton gets a lift under warm conditions with moderate rainfall windows.',
    );
  }

  return {
    cropName,
    score: Number(Math.min(0.95, score).toFixed(2)),
    rationale: rationaleParts.join(' '),
  };
}

function buildRailwayPredictionPayload(input: CropSuggestionRequest) {
  const defaultedFields: string[] = [];
  const soilMetrics = input.soilMetrics ?? {};

  const payload = {
    n: readMetricOrDefault(soilMetrics.n, 80, 'N', defaultedFields),
    p: readMetricOrDefault(soilMetrics.p, 40, 'P', defaultedFields),
    k: readMetricOrDefault(soilMetrics.k, 40, 'K', defaultedFields),
    soil_ph: readMetricOrDefault(
      soilMetrics.ph,
      6.5,
      'soil pH',
      defaultedFields,
    ),
    temp: readMetricOrDefault(
      input.weather.currentTemperatureC,
      28,
      'temperature',
      defaultedFields,
    ),
    humidity: readMetricOrDefault(
      input.weather.humidityPercent,
      68,
      'humidity',
      defaultedFields,
    ),
  };

  return { payload, defaultedFields };
}

function normalizeRailwaySuggestions(
  value: Record<string, unknown>,
  cropCatalog: Array<{ nameEn: string }>,
  defaultedFields: string[],
) {
  const topPredictions = Array.isArray(value.top_3_predictions)
    ? value.top_3_predictions
    : [];

  return topPredictions
    .map((entry) =>
      normalizeRailwaySuggestion(entry, cropCatalog, defaultedFields),
    )
    .filter((entry): entry is CropSuggestion => entry != null)
    .slice(0, 3);
}

function normalizeRailwaySuggestion(
  value: unknown,
  cropCatalog: Array<{ nameEn: string }>,
  defaultedFields: string[],
): CropSuggestion | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const rawCrop = readString(record.crop);
  const probability = readNumber(record.probability);

  if (!rawCrop || !Number.isFinite(probability)) {
    return null;
  }

  const mappedCropName = mapRailwayCropNameToCatalog(rawCrop, cropCatalog);

  if (!mappedCropName) {
    return null;
  }

  const rationaleParts = [
    summarizeRailwayExplanation(readString(record.rag_evaluation)),
  ];

  if (rawCrop.trim().toLowerCase() !== mappedCropName.toLowerCase()) {
    rationaleParts.push(`Mapped from live model label "${rawCrop}".`);
  }

  if (defaultedFields.length > 0) {
    rationaleParts.push(
      `Estimated ${joinLabels(defaultedFields)} because those inputs were not provided.`,
    );
  }

  return {
    cropName: mappedCropName,
    score: Number(Math.max(0, Math.min(probability, 1)).toFixed(2)),
    rationale: rationaleParts.filter(Boolean).join(' '),
  };
}

function normalizeCropSuggestion(value: unknown): CropSuggestion | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const cropName =
    readString((value as Record<string, unknown>).cropName) ??
    readString((value as Record<string, unknown>).name);
  const score = readNumber((value as Record<string, unknown>).score);
  const rationale =
    readString((value as Record<string, unknown>).rationale) ??
    'Returned by external prediction provider.';

  if (!cropName || !Number.isFinite(score)) {
    return null;
  }

  return {
    cropName,
    score: Number(Math.max(0, Math.min(score, 1)).toFixed(2)),
    rationale,
  };
}

function normalizeResourcePrediction(value: Record<string, unknown>) {
  const cropName = readString(value.cropName) ?? readString(value.crop) ?? null;
  const currentStage =
    readString(value.currentStage) ?? readString(value.stage) ?? 'Monitoring';
  const weeklyWaterMm = readNumber(
    value.weeklyWaterMm ?? value.waterMm ?? value.water_requirement,
  );
  const fertilizerNeed =
    readString(value.fertilizerNeed) ??
    readString(value.fertilizer_note) ??
    'Review local nutrient need';
  const pesticideNeedLevel =
    readString(value.pesticideNeedLevel) ??
    readString(value.pesticide_need_level) ??
    'WATCH';
  const recommendations = Array.isArray(value.recommendations)
    ? value.recommendations.filter(
        (item): item is string => typeof item === 'string',
      )
    : [];
  const safetyNote =
    readString(value.safetyNote) ??
    'Confirm input decisions with field scouting and local agronomy advice.';

  if (!cropName || !Number.isFinite(weeklyWaterMm)) {
    return null;
  }

  return {
    cropName,
    currentStage,
    weeklyWaterMm: Math.max(0, Math.round(weeklyWaterMm)),
    fertilizerNeed,
    pesticideNeedLevel:
      pesticideNeedLevel === 'HIGH'
        ? 'HIGH'
        : pesticideNeedLevel === 'LOW'
          ? 'LOW'
          : 'WATCH',
    recommendations,
    safetyNote,
  } satisfies ResourcePrediction;
}

function mapRailwayCropNameToCatalog(
  cropName: string,
  cropCatalog: Array<{ nameEn: string }>,
) {
  const catalogMap = new Map(
    cropCatalog.map((crop) => [crop.nameEn.trim().toLowerCase(), crop.nameEn]),
  );
  const normalizedCropName = cropName.trim().toLowerCase();
  const aliases: Record<string, string> = {
    rice: 'paddy',
    paddy: 'paddy',
    wheat: 'wheat',
    cotton: 'cotton',
  };
  const alias = aliases[normalizedCropName] ?? normalizedCropName;

  return catalogMap.get(alias) ?? null;
}

function summarizeRailwayExplanation(value: string | null) {
  if (!value) {
    return 'Returned by the live crop suitability model.';
  }

  const plainText = value
    .replace(/[`*_>#-]/g, ' ')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (!plainText) {
    return 'Returned by the live crop suitability model.';
  }

  return plainText.length > 200
    ? `${plainText.slice(0, 197).trimEnd()}...`
    : plainText;
}

function mergeCropSuggestions(
  primary: CropSuggestion[],
  fallback: CropSuggestion[],
) {
  const merged: CropSuggestion[] = [];
  const seen = new Set<string>();

  for (const suggestion of [...primary, ...fallback]) {
    const key = suggestion.cropName.trim().toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(suggestion);

    if (merged.length === 3) {
      break;
    }
  }

  return merged;
}

function readMetricOrDefault(
  value: number | undefined,
  fallback: number,
  label: string,
  defaultedFields: string[],
) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  defaultedFields.push(label);
  return fallback;
}

function joinLabels(values: string[]) {
  if (values.length <= 1) {
    return values[0] ?? '';
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  return Number.NaN;
}
