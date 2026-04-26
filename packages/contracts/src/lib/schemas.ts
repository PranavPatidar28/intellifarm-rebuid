import { z } from 'zod';

import {
  alertTypes,
  assistantMessageRoles,
  cropSeasonStatuses,
  diseaseAnalysisSources,
  diseaseCaptureModes,
  diseaseReportStatuses,
  facilityTypes,
  irrigationTypes,
  predictionInputConfidenceLevels,
  predictionStatuses,
  predictionTypes,
  preferredLanguages,
  seasonClimateMethods,
  seasonKeys,
  severityLevels,
  soilProfileSources,
  soilTypes,
  taskPriorities,
  taskStatuses,
  taskTypes,
  userRoles,
  weatherLocationSources,
} from './enums';

const queryBooleanSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return value;
}, z.boolean());

const facilityTypesQuerySchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return value;
}, z.array(z.enum(facilityTypes)).optional());

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid Indian mobile number');

export const otpRequestSchema = z.object({
  phone: phoneSchema,
});

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  otp: z.string().trim().length(6),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  preferredLanguage: z.enum(preferredLanguages),
  state: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  village: z.string().trim().min(2).max(80),
});

export const createFarmPlotSchema = z.object({
  name: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  village: z.string().trim().min(2).max(80),
  area: z.number().positive(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  irrigationType: z.enum(irrigationTypes),
  soilType: z.enum(soilTypes).optional().nullable(),
});

export const updateFarmPlotSchema = createFarmPlotSchema.partial();

export const createCropSeasonSchema = z.object({
  cropDefinitionId: z.string().uuid(),
  cropName: z.string().trim().min(2).max(80),
  sowingDate: z.coerce.date(),
  status: z.enum(cropSeasonStatuses).default('ACTIVE'),
});

export const updateCropSeasonSchema = createCropSeasonSchema.partial();

export const updateTaskSchema = z.object({
  status: z.enum(taskStatuses),
});

export const marketQuerySchema = z.object({
  cropName: z.string().trim().optional(),
  state: z.string().trim().optional(),
  district: z.string().trim().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  bestPriceOnly: queryBooleanSchema.optional(),
  includeDistance: queryBooleanSchema.optional(),
}).superRefine((value, context) => {
  const hasLatitude = typeof value.latitude === 'number';
  const hasLongitude = typeof value.longitude === 'number';

  if (hasLatitude !== hasLongitude) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Latitude and longitude must be provided together',
      path: hasLatitude ? ['longitude'] : ['latitude'],
    });
  }
});

export const nearbyFacilitiesQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  cropName: z.string().trim().optional(),
  radiusKm: z.coerce.number().positive().max(500).optional().default(150),
  types: facilityTypesQuerySchema,
});

export const schemeQuerySchema = z.object({
  state: z.string().trim().optional(),
  category: z.string().trim().optional(),
  language: z.enum(preferredLanguages).optional(),
  cropName: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

export const weatherLocationQuerySchema = z
  .object({
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  })
  .superRefine((value, context) => {
    const hasLatitude = typeof value.latitude === 'number';
    const hasLongitude = typeof value.longitude === 'number';

    if (hasLatitude !== hasLongitude) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Latitude and longitude must be provided together',
        path: hasLatitude ? ['longitude'] : ['latitude'],
      });
    }
  });

export const createDiseaseReportSchema = z.object({
  cropSeasonId: z.string().uuid(),
  userNote: z.string().trim().max(500).optional(),
  captureMode: z.enum(diseaseCaptureModes).default('CAMERA_DUAL_ANGLE'),
});

export const soilMetricsSchema = z
  .object({
    n: z.number().min(0).max(1000).optional(),
    p: z.number().min(0).max(1000).optional(),
    k: z.number().min(0).max(1000).optional(),
    ph: z.number().min(0).max(14).optional(),
  })
  .refine(
    (value) =>
      value.n != null || value.p != null || value.k != null || value.ph != null,
    {
      message: 'Provide at least one soil metric',
    },
  );

export const seasonProfileSchema = z.object({
  seasonKey: z.enum(seasonKeys),
  sowingMonth: z.number().int().min(1).max(12),
});

export const explorerContextSchema = z
  .object({
    state: z.string().trim().min(2).max(80),
    district: z.string().trim().min(2).max(80).optional(),
    village: z.string().trim().min(2).max(80).optional(),
    irrigationType: z.enum(irrigationTypes),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .superRefine((value, context) => {
    const hasLatitude = typeof value.latitude === 'number';
    const hasLongitude = typeof value.longitude === 'number';

    if (hasLatitude !== hasLongitude) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Latitude and longitude must be provided together',
        path: hasLatitude ? ['longitude'] : ['latitude'],
      });
    }
  });

const optionalLocationOverrideSchema = z
  .object({
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .superRefine((value, context) => {
    const hasLatitude = typeof value.latitude === 'number';
    const hasLongitude = typeof value.longitude === 'number';

    if (hasLatitude !== hasLongitude) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Latitude and longitude must be provided together',
        path: hasLatitude ? ['longitude'] : ['latitude'],
      });
    }
  });

export const cropSuggestionPredictionSchema = z.object({
  farmPlotId: z.string().uuid().optional(),
  explorerContext: explorerContextSchema.optional(),
  seasonProfile: seasonProfileSchema,
  soilType: z.enum(soilTypes).optional(),
  soilMetrics: soilMetricsSchema.optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  weatherOverride: z
    .object({
      currentTemperatureC: z.number().optional(),
      humidityPercent: z.number().min(0).max(100).optional(),
      rainfallExpectedMm: z.number().optional(),
    })
    .optional(),
}).superRefine((value, context) => {
  const hasLatitude = typeof value.latitude === 'number';
  const hasLongitude = typeof value.longitude === 'number';

  if (hasLatitude !== hasLongitude) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Latitude and longitude must be provided together',
      path: hasLatitude ? ['longitude'] : ['latitude'],
    });
  }

  if (!value.farmPlotId && !value.explorerContext) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide either a farm plot or explorer context',
      path: ['farmPlotId'],
    });
  }

  if (value.farmPlotId && value.explorerContext) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Choose either saved plot mode or explorer mode, not both',
      path: ['explorerContext'],
    });
  }
});

export const predictionRunsQuerySchema = z.object({
  type: z.enum(predictionTypes).optional(),
  farmPlotId: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(20).optional().default(5),
});

export const resourcePredictionSchema = z.object({
  cropSeasonId: z.string().uuid(),
  soilMetrics: soilMetricsSchema.optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
}).superRefine((value, context) => {
  const hasLatitude = typeof value.latitude === 'number';
  const hasLongitude = typeof value.longitude === 'number';

  if (hasLatitude !== hasLongitude) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Latitude and longitude must be provided together',
      path: hasLatitude ? ['longitude'] : ['latitude'],
    });
  }
});

export const createAssistantThreadSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
});

export const createAssistantMessageSchema = z.object({
  content: z.string().trim().min(2).max(2000),
});

export const userSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string(),
  preferredLanguage: z.enum(preferredLanguages),
  state: z.string(),
  district: z.string(),
  village: z.string(),
  profilePhotoUrl: z.string().nullable(),
  role: z.enum(userRoles),
});

export const dashboardTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  dueDate: z.string(),
  taskType: z.enum(taskTypes),
  priority: z.enum(taskPriorities),
  status: z.enum(taskStatuses),
});

export const dashboardAlertSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  message: z.string(),
  alertType: z.enum(alertTypes),
  severity: z.enum(severityLevels),
  isRead: z.boolean(),
});

export const weatherSummarySchema = z.object({
  currentTemperatureC: z.number(),
  forecastSummary: z.string(),
  rainfallExpectedMm: z.number(),
  advisories: z.array(z.string()),
  forecastDays: z.array(
    z.object({
      date: z.string(),
      maxTemperatureC: z.number(),
      minTemperatureC: z.number(),
      rainfallMm: z.number(),
    }),
  ),
  source: z.string(),
  locationSource: z.enum(weatherLocationSources),
  locationLabel: z.string(),
});

export const seasonSummarySchema = z.object({
  cropSeasonId: z.string().uuid(),
  cropName: z.string(),
  sowingDate: z.string(),
  currentStage: z.string(),
  farmPlotName: z.string(),
  tasks: z.array(dashboardTaskSchema),
  alerts: z.array(dashboardAlertSchema),
  weather: weatherSummarySchema.nullable(),
});

export const dashboardResponseSchema = z.object({
  user: userSummarySchema,
  seasons: z.array(seasonSummarySchema),
});

export const diseaseResultSchema = z.object({
  predictedIssue: z.string().nullable(),
  confidenceScore: z.number(),
  recommendation: z.string(),
  escalationRequired: z.boolean(),
  status: z.enum(diseaseReportStatuses),
  provider: z.string(),
  captureMode: z.enum(diseaseCaptureModes),
  analysisSource: z.enum(diseaseAnalysisSources),
});

export const facilitySummarySchema = z.object({
  id: z.string().uuid(),
  type: z.enum(facilityTypes),
  name: z.string(),
  district: z.string(),
  state: z.string(),
  village: z.string().nullable().optional(),
  latitude: z.number(),
  longitude: z.number(),
  distanceKm: z.number(),
  services: z.array(z.string()),
  latestMarket: z
    .object({
      cropName: z.string(),
      mandiName: z.string(),
      priceMin: z.number(),
      priceMax: z.number(),
      priceModal: z.number(),
      recordDate: z.string(),
      source: z.string(),
    })
    .nullable(),
});

export const predictionSummarySchema = z.object({
  id: z.string().uuid(),
  type: z.enum(predictionTypes),
  provider: z.string(),
  status: z.enum(predictionStatuses),
  createdAt: z.string(),
  outputJson: z.record(z.string(), z.unknown()),
});

export const cropSuggestionSchema = z.object({
  cropName: z.string(),
  score: z.number(),
  rationale: z.string(),
});

export const cropPredictionSoilProfileSchema = z.object({
  soilType: z.enum(soilTypes).nullable().optional(),
  source: z.enum(soilProfileSources),
  summary: z.string(),
});

export const cropPredictionSeasonClimateSchema = z.object({
  method: z.enum(seasonClimateMethods),
  averageTempC: z.number(),
  averageHumidityPercent: z.number(),
  totalRainfallMm: z.number(),
  label: z.string(),
});

export const cropSuggestionPredictionResponseSchema = z.object({
  prediction: predictionSummarySchema.omit({ outputJson: true }),
  suggestions: z.array(cropSuggestionSchema),
  inputConfidence: z.enum(predictionInputConfidenceLevels),
  soilProfile: cropPredictionSoilProfileSchema,
  seasonClimate: cropPredictionSeasonClimateSchema,
  assumptions: z.array(z.string()),
  weather: z.object({
    currentTemperatureC: z.number(),
    humidityPercent: z.number(),
    rainfallExpectedMm: z.number(),
  }),
});

export const assistantSourceSchema = z.object({
  type: z.string(),
  label: z.string(),
  referenceId: z.string().optional(),
});

export const assistantMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(assistantMessageRoles),
  content: z.string(),
  sources: z.array(assistantSourceSchema),
  safetyFlags: z.array(z.string()),
  createdAt: z.string(),
});
