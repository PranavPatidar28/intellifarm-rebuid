import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ─── ML API request/response types ───────────────────────────────────────────

export type FarmerProfileRequest = {
  district: string;
  season: 'Kharif' | 'Rabi' | 'Whole Year';
  farm_size_acre: number;
  soil_type:
    | 'Black Soil'
    | 'Clay Soil'
    | 'Loamy Soil'
    | 'Mixed Soil'
    | 'Red Soil'
    | 'Sandy Soil';
  water_availability_score: number;
  prediction_year: number;
  rainfall?: number | null;
  avg_temperature?: number | null;
  min_temperature?: number | null;
  max_temperature?: number | null;
  avg_humidity?: number | null;
  soil_ph?: number | null;
  N?: number | null;
  P?: number | null;
  K?: number | null;
};

export type RagExplanationSection = {
  heading: string;
  text: string;
};

export type MLCropRecommendation = {
  crop_name: string;
  average_yield_tonne_per_hectare: number;
  best_case_yield_tonne_per_hectare: number;
  worst_case_yield_tonne_per_hectare: number;
  average_profit_rs: number;
  average_revenue_rs: number;
  estimated_cost_rs: number;
  failure_risk_pct: number;
  final_score: number;
  rag_explanation: {
    summary: RagExplanationSection[];
  };
  suggestion: string;
};

export type IntelliFarmMLResponse = {
  top_3_crops: MLCropRecommendation[];
  crop_must_not_be_grown: string | null;
};

// ─── Mapping helpers ─────────────────────────────────────────────────────────

type AppSoilType =
  | 'ALLUVIAL'
  | 'BLACK_REGUR'
  | 'RED'
  | 'LATERITE'
  | 'SANDY'
  | 'CLAY_HEAVY'
  | 'LOAMY_MIXED'
  | 'NOT_SURE';

type AppSeasonKey = 'KHARIF' | 'RABI' | 'ZAID' | 'CUSTOM';

type AppIrrigationType =
  | 'RAIN_FED'
  | 'DRIP'
  | 'SPRINKLER'
  | 'FLOOD'
  | 'MANUAL';

const SOIL_TYPE_MAP: Record<AppSoilType, FarmerProfileRequest['soil_type']> = {
  ALLUVIAL: 'Loamy Soil',
  BLACK_REGUR: 'Black Soil',
  RED: 'Red Soil',
  LATERITE: 'Red Soil',
  SANDY: 'Sandy Soil',
  CLAY_HEAVY: 'Clay Soil',
  LOAMY_MIXED: 'Loamy Soil',
  NOT_SURE: 'Mixed Soil',
};

const SEASON_MAP: Record<AppSeasonKey, FarmerProfileRequest['season']> = {
  KHARIF: 'Kharif',
  RABI: 'Rabi',
  ZAID: 'Whole Year',
  CUSTOM: 'Whole Year',
};

const WATER_SCORE_MAP: Record<AppIrrigationType, number> = {
  DRIP: 0.8,
  SPRINKLER: 0.7,
  FLOOD: 0.9,
  RAIN_FED: 0.4,
  MANUAL: 0.5,
};

/** Districts accepted by the IntelliFarm ML API (Madhya Pradesh only). */
const ALLOWED_DISTRICTS = new Set([
  'Aalirajpur', 'Agar Malwa', 'Anuppur', 'AshokNagar', 'Balaghat',
  'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur',
  'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas',
  'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda',
  'Indore', 'Jabalpur', 'Jhabua', 'KHANDWA', 'Katni',
  'Khargone', 'Maihar', 'Mandla', 'Mandsaur', 'Mauganj',
  'Morena', 'Narmadapuram', 'Narsinghpur', 'Neemuch', 'Niwari',
  'Pandhurna', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam',
  'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni',
  'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi',
  'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha',
]);

/** Case-insensitive lookup map for districts. */
const DISTRICT_LOOKUP = new Map(
  Array.from(ALLOWED_DISTRICTS).map((d) => [d.toLowerCase(), d]),
);

const DEFAULT_DISTRICT = 'Bhopal';

export function mapDistrictToMLApi(
  district: string | null | undefined,
): string {
  if (!district?.trim()) return DEFAULT_DISTRICT;
  const normalized = district.trim().toLowerCase();
  return DISTRICT_LOOKUP.get(normalized) ?? DEFAULT_DISTRICT;
}

export function mapSoilTypeToMLApi(
  soilType: string | null | undefined,
): FarmerProfileRequest['soil_type'] {
  if (!soilType) return 'Mixed Soil';
  return SOIL_TYPE_MAP[soilType as AppSoilType] ?? 'Mixed Soil';
}

export function mapSeasonKeyToMLApi(
  seasonKey: string,
): FarmerProfileRequest['season'] {
  return SEASON_MAP[seasonKey as AppSeasonKey] ?? 'Whole Year';
}

export function deriveWaterAvailabilityScore(
  irrigationType: string | null | undefined,
): number {
  if (!irrigationType) return 0.5;
  return WATER_SCORE_MAP[irrigationType as AppIrrigationType] ?? 0.5;
}

type WaterSupplyLevel = 'PLENTY' | 'MODERATE' | 'LIMITED' | 'SCARCE';

const WATER_SUPPLY_MAP: Record<WaterSupplyLevel, number> = {
  PLENTY: 0.9,
  MODERATE: 0.7,
  LIMITED: 0.5,
  SCARCE: 0.3,
};

export function mapWaterSupplyLevelToScore(
  level: string | null | undefined,
): number | null {
  if (!level) return null;
  return WATER_SUPPLY_MAP[level as WaterSupplyLevel] ?? null;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class IntelliFarmMLService {
  private readonly logger = new Logger(IntelliFarmMLService.name);

  constructor(private readonly configService: ConfigService) {}

  async predictCrops(
    request: FarmerProfileRequest,
  ): Promise<IntelliFarmMLResponse> {
    const baseUrl = this.configService.get<string>(
      'INTELLIFARM_ML_API_URL',
      'https://intellifarm-ml-api-338815576551.asia-south1.run.app',
    );

    const url = `${baseUrl.replace(/\/$/, '')}/predict`;

    this.logger.log(
      `Calling ML API: ${url} for district=${request.district}, season=${request.season}`,
    );
    this.logger.debug(`ML API payload: ${JSON.stringify(request)}`);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
    } catch (networkError) {
      this.logger.error(
        `ML API network error: ${networkError instanceof Error ? networkError.message : String(networkError)}`,
      );
      throw new BadGatewayException(
        'The crop prediction service is temporarily unreachable. Please try again shortly.',
      );
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      this.logger.error(
        `ML API responded ${response.status}: ${errorBody.slice(0, 1000)}`,
      );

      if (response.status === 422) {
        this.logger.error(`ML API 422 rejection. Request was: ${JSON.stringify(request)}`);
        throw new BadRequestException(
          `The prediction request was rejected by the ML model. Detail: ${errorBody.slice(0, 300)}`,
        );
      }

      throw new BadGatewayException(
        `The crop prediction service returned an error (${response.status}). Please try again.`,
      );
    }

    const raw = (await response.json()) as Record<string, unknown>;

    return normalizeMLResponse(raw);
  }
}

function normalizeMLResponse(raw: Record<string, unknown>): IntelliFarmMLResponse {
  const topCrops = Array.isArray(raw.top_3_crops) ? raw.top_3_crops : [];

  return {
    top_3_crops: topCrops.map(normalizeCropRecommendation).filter(Boolean) as MLCropRecommendation[],
    crop_must_not_be_grown:
      typeof raw.crop_must_not_be_grown === 'string'
        ? raw.crop_must_not_be_grown
        : null,
  };
}

function normalizeCropRecommendation(
  value: unknown,
): MLCropRecommendation | null {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;

  const cropName =
    typeof record.crop_name === 'string' ? record.crop_name : null;
  if (!cropName) return null;

  const ragSummary = normalizeRagExplanation(record.rag_explanation);

  return {
    crop_name: cropName,
    average_yield_tonne_per_hectare: safeNumber(record.average_yield_tonne_per_hectare, 0),
    best_case_yield_tonne_per_hectare: safeNumber(record.best_case_yield_tonne_per_hectare, 0),
    worst_case_yield_tonne_per_hectare: safeNumber(record.worst_case_yield_tonne_per_hectare, 0),
    average_profit_rs: safeNumber(record.average_profit_rs, 0),
    average_revenue_rs: safeNumber(record.average_revenue_rs, 0),
    estimated_cost_rs: safeNumber(record.estimated_cost_rs, 0),
    failure_risk_pct: safeNumber(record.failure_risk_pct, 0),
    final_score: safeNumber(record.final_score, 0),
    rag_explanation: { summary: ragSummary },
    suggestion:
      typeof record.suggestion === 'string'
        ? record.suggestion
        : 'Review this crop option against local conditions.',
  };
}

function normalizeRagExplanation(
  value: unknown,
): RagExplanationSection[] {
  if (!value || typeof value !== 'object') return [];

  const record = value as Record<string, unknown>;
  const summaryArray = Array.isArray(record.summary) ? record.summary : [];

  return summaryArray
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const e = entry as Record<string, unknown>;
      const heading =
        typeof e.heading === 'string' ? e.heading : 'Analysis';
      const text = typeof e.text === 'string' ? e.text : '';
      if (!text) return null;
      return { heading, text };
    })
    .filter(Boolean) as RagExplanationSection[];
}

function safeNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
