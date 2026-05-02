import { Injectable } from '@nestjs/common';
import { type SoilType } from '@prisma/client';

type SoilMetrics = {
  n?: number;
  p?: number;
  k?: number;
  ph?: number;
};

type PredictionInputConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
type SoilProfileSource =
  | 'ADVANCED_METRICS'
  | 'PAGE_SOIL_TYPE'
  | 'PLOT_SAVED_SOIL_TYPE'
  | 'UNKNOWN_DEFAULT';

type SoilProfileResult = {
  soilMetrics: Required<SoilMetrics>;
  soilType: SoilType | null;
  source: SoilProfileSource;
  summary: string;
  inputConfidence: PredictionInputConfidence;
  assumptions: string[];
};

type SoilRangeProfile = {
  label: string;
  nRange: [number, number];
  pRange: [number, number];
  kRange: [number, number];
  ph: number;
  summary: string;
};

const SOIL_PROXY_PROFILES: Record<SoilType, SoilRangeProfile> = {
  ALLUVIAL: {
    label: 'Alluvial',
    nRange: [36, 54],
    pRange: [46, 64],
    kRange: [70, 90],
    ph: 7.2,
    summary:
      'Using an alluvial-soil estimate based on typical N/P/K ranges and a representative pH.',
  },
  BLACK_REGUR: {
    label: 'Black (Regur)',
    nRange: [30, 50],
    pRange: [24, 46],
    kRange: [76, 94],
    ph: 7.8,
    summary:
      'Using a black-regur estimate based on typical N/P/K ranges and a representative pH.',
  },
  RED: {
    label: 'Red',
    nRange: [24, 40],
    pRange: [18, 38],
    kRange: [46, 64],
    ph: 6.4,
    summary:
      'Using a red-soil estimate based on typical N/P/K ranges and a representative pH.',
  },
  LATERITE: {
    label: 'Laterite',
    nRange: [18, 32],
    pRange: [12, 24],
    kRange: [30, 50],
    ph: 5.6,
    summary:
      'Using a laterite-soil estimate based on typical N/P/K ranges and a representative pH.',
  },
  SANDY: {
    label: 'Sandy',
    nRange: [12, 28],
    pRange: [16, 28],
    kRange: [20, 40],
    ph: 7.4,
    summary:
      'Using a sandy-soil estimate based on typical N/P/K ranges and a representative pH.',
  },
  CLAY_HEAVY: {
    label: 'Clay-heavy',
    nRange: [38, 58],
    pRange: [28, 48],
    kRange: [64, 86],
    ph: 7.5,
    summary:
      'Using a clay-heavy estimate based on typical N/P/K ranges and a representative pH.',
  },
  LOAMY_MIXED: {
    label: 'Loamy / Mixed',
    nRange: [34, 50],
    pRange: [34, 56],
    kRange: [56, 74],
    ph: 6.8,
    summary:
      'Using a loamy mixed-soil estimate based on typical N/P/K ranges and a representative pH.',
  },
  NOT_SURE: {
    label: 'Not sure',
    nRange: [28, 48],
    pRange: [24, 46],
    kRange: [40, 60],
    ph: 6.8,
    summary:
      'Using a broad mixed-soil estimate because soil type is not confirmed yet.',
  },
};

@Injectable()
export class SoilProfileResolver {
  resolve(input: {
    soilMetrics?: SoilMetrics;
    soilType?: SoilType | null;
    savedSoilType?: SoilType | null;
  }): SoilProfileResult {
    return resolveSoilProfile(input);
  }
}

export function resolveSoilProfile(input: {
  soilMetrics?: SoilMetrics;
  soilType?: SoilType | null;
  savedSoilType?: SoilType | null;
}): SoilProfileResult {
  const manualMetrics = input.soilMetrics ?? {};
  const hasManualMetric = Object.values(manualMetrics).some(
    (value) => typeof value === 'number' && Number.isFinite(value),
  );
  const selectedSoilType = input.soilType ?? null;
  const savedSoilType = input.savedSoilType ?? null;
  const fallbackSoilType = selectedSoilType ?? savedSoilType ?? 'NOT_SURE';
  const proxyProfile = SOIL_PROXY_PROFILES[fallbackSoilType];
  const proxyMetrics = pickProxyMetrics(proxyProfile);

  if (hasManualMetric) {
    const missingFields = (['n', 'p', 'k', 'ph'] as const).filter(
      (field) => manualMetrics[field] == null,
    );
    const hasExactAdvancedMetrics = missingFields.length === 0;
    const assumptions = hasExactAdvancedMetrics
      ? ['Using your exact advanced soil values.']
      : [
          `Using your advanced soil values with ${proxyProfile.label.toLowerCase()} fallback estimates for ${joinLabels(missingFields.map(toMetricLabel))}.`,
        ];

    return {
      soilMetrics: {
        n: manualMetrics.n ?? proxyMetrics.n,
        p: manualMetrics.p ?? proxyMetrics.p,
        k: manualMetrics.k ?? proxyMetrics.k,
        ph: manualMetrics.ph ?? proxyMetrics.ph,
      },
      soilType: selectedSoilType ?? savedSoilType,
      source: 'ADVANCED_METRICS',
      summary: hasExactAdvancedMetrics
        ? 'Using your exact advanced soil values.'
        : `Using your advanced soil values with ${proxyProfile.label.toLowerCase()} range-based nutrient fallbacks for missing fields.`,
      inputConfidence: hasExactAdvancedMetrics
        ? 'HIGH'
        : fallbackSoilType === 'NOT_SURE'
          ? 'LOW'
          : 'MEDIUM',
      assumptions,
    };
  }

  if (selectedSoilType) {
    return {
      soilMetrics: pickProxyMetrics(proxyProfile),
      soilType: selectedSoilType,
      source: 'PAGE_SOIL_TYPE',
      summary: proxyProfile.summary,
      inputConfidence: selectedSoilType === 'NOT_SURE' ? 'LOW' : 'MEDIUM',
      assumptions: [
        `Using the selected ${proxyProfile.label.toLowerCase()} soil profile with N/P/K midpoint estimates from its typical range.`,
      ],
    };
  }

  if (savedSoilType) {
    return {
      soilMetrics: pickProxyMetrics(proxyProfile),
      soilType: savedSoilType,
      source: 'PLOT_SAVED_SOIL_TYPE',
      summary: `Using the saved ${proxyProfile.label.toLowerCase()} soil profile for this plot.`,
      inputConfidence: savedSoilType === 'NOT_SURE' ? 'LOW' : 'MEDIUM',
      assumptions: [
        `Using the saved ${proxyProfile.label.toLowerCase()} soil type from this plot with N/P/K midpoint estimates from its typical range.`,
      ],
    };
  }

  return {
    soilMetrics: pickProxyMetrics(proxyProfile),
    soilType: null,
    source: 'UNKNOWN_DEFAULT',
    summary: proxyProfile.summary,
    inputConfidence: 'LOW',
    assumptions: [
      'Soil type is not confirmed yet, so the prediction is using a broad mixed-soil midpoint estimate.',
    ],
  };
}

function pickProxyMetrics(profile: SoilRangeProfile) {
  return {
    n: pickRangeMidpoint(profile.nRange),
    p: pickRangeMidpoint(profile.pRange),
    k: pickRangeMidpoint(profile.kRange),
    ph: profile.ph,
  };
}

function pickRangeMidpoint([min, max]: [number, number]) {
  return Math.round((min + max) / 2);
}

function toMetricLabel(metric: 'n' | 'p' | 'k' | 'ph') {
  const labels = {
    n: 'N',
    p: 'P',
    k: 'K',
    ph: 'pH',
  } satisfies Record<'n' | 'p' | 'k' | 'ph', string>;

  return labels[metric];
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
