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

type SoilProxyProfile = {
  label: string;
  n: number;
  p: number;
  k: number;
  ph: number;
  summary: string;
};

const SOIL_PROXY_PROFILES: Record<SoilType, SoilProxyProfile> = {
  ALLUVIAL: {
    label: 'Alluvial',
    n: 45,
    p: 55,
    k: 80,
    ph: 7.2,
    summary:
      'Using an alluvial-soil proxy with balanced fertility assumptions.',
  },
  BLACK_REGUR: {
    label: 'Black (Regur)',
    n: 40,
    p: 35,
    k: 85,
    ph: 7.8,
    summary:
      'Using a black-regur soil proxy with stronger potassium assumptions.',
  },
  RED: {
    label: 'Red',
    n: 32,
    p: 28,
    k: 55,
    ph: 6.4,
    summary: 'Using a red-soil proxy with medium-low fertility assumptions.',
  },
  LATERITE: {
    label: 'Laterite',
    n: 25,
    p: 18,
    k: 40,
    ph: 5.6,
    summary:
      'Using a laterite-soil proxy with lower fertility and more acidic assumptions.',
  },
  SANDY: {
    label: 'Sandy',
    n: 20,
    p: 22,
    k: 30,
    ph: 7.4,
    summary:
      'Using a sandy-soil proxy with lower nutrient holding assumptions.',
  },
  CLAY_HEAVY: {
    label: 'Clay-heavy',
    n: 48,
    p: 38,
    k: 75,
    ph: 7.5,
    summary:
      'Using a clay-heavy soil proxy with stronger moisture and potassium assumptions.',
  },
  LOAMY_MIXED: {
    label: 'Loamy / Mixed',
    n: 42,
    p: 45,
    k: 65,
    ph: 6.8,
    summary:
      'Using a loamy mixed-soil proxy with moderate balanced fertility assumptions.',
  },
  NOT_SURE: {
    label: 'Not sure',
    n: 38,
    p: 35,
    k: 50,
    ph: 6.8,
    summary:
      'Using a broad mixed-soil proxy because soil type is not confirmed yet.',
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

  if (hasManualMetric) {
    const missingFields = (['n', 'p', 'k', 'ph'] as const).filter(
      (field) => manualMetrics[field] == null,
    );
    const hasExactAdvancedMetrics = missingFields.length === 0;
    const assumptions = hasExactAdvancedMetrics
      ? ['Using your exact advanced soil values.']
      : [
          `Using your advanced soil values with ${proxyProfile.label.toLowerCase()} estimates for ${joinLabels(missingFields.map(toMetricLabel))}.`,
        ];

    return {
      soilMetrics: {
        n: manualMetrics.n ?? proxyProfile.n,
        p: manualMetrics.p ?? proxyProfile.p,
        k: manualMetrics.k ?? proxyProfile.k,
        ph: manualMetrics.ph ?? proxyProfile.ph,
      },
      soilType: selectedSoilType ?? savedSoilType,
      source: 'ADVANCED_METRICS',
      summary: hasExactAdvancedMetrics
        ? 'Using your exact advanced soil values.'
        : `Using your advanced soil values with ${proxyProfile.label.toLowerCase()} estimates for missing fields.`,
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
        `Using the selected ${proxyProfile.label.toLowerCase()} soil profile as a proxy.`,
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
        `Using the saved ${proxyProfile.label.toLowerCase()} soil type from this plot.`,
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
      'Soil type is not confirmed yet, so the prediction is using a broad mixed-soil proxy.',
    ],
  };
}

function pickProxyMetrics(profile: SoilProxyProfile) {
  return {
    n: profile.n,
    p: profile.p,
    k: profile.k,
    ph: profile.ph,
  };
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
