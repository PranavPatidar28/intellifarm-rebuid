import { z } from 'zod';

import {
  alertTypes,
  assistantAttachmentTypes,
  assistantConfidenceLabels,
  assistantSafetyLevels,
  assistantMessageRoles,
  communityCategories,
  communityFeedScopes,
  communityReportReasons,
  communityReportTargets,
  cropSeasonStatuses,
  expenseCategories,
  expenseScopes,
  expenseStatuses,
  diseaseConfidenceBands,
  diseaseAnalysisSources,
  diseaseCaptureModes,
  diseaseReportStatuses,
  fieldWindowStatuses,
  facilityTypes,
  irrigationTypes,
  marketExplorerScopes,
  marketTrendDirections,
  predictionInputConfidenceLevels,
  predictionStatuses,
  predictionTypes,
  preferredLanguages,
  seasonClimateMethods,
  seasonKeys,
  severityLevels,
  schemeEligibilityTones,
  schemePriorityLevels,
  soilProfileSources,
  soilTypes,
  taskPriorities,
  taskStatuses,
  taskTypes,
  userRoles,
  weatherConditionCodes,
  weatherLocationSources,
  weatherRiskLevels,
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

const optionalUuidStringSchema = z.preprocess((value) => {
  if (typeof value === 'string' && !value.trim()) {
    return undefined;
  }

  return value;
}, z.string().uuid().optional());

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

const bodyBooleanSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return value;
}, z.boolean());

const nullablePositiveAmountSchema = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    return Number(trimmed);
  }

  return value;
}, z.number().positive().nullable());

const optionalShortTextSchema = (maxLength: number) =>
  z.preprocess((value) => {
    if (typeof value === 'string' && !value.trim()) {
      return undefined;
    }

    return value;
  }, z.string().trim().max(maxLength).optional());

export const createExpenseSchema = z.object({
  cropSeasonId: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
  amount: z.coerce.number().positive().max(10_000_000),
  expenseDate: z.coerce.date(),
  category: z.enum(expenseCategories),
  status: z.enum(expenseStatuses).default('PAID'),
  isRecurring: bodyBooleanSchema.default(false),
  vendor: optionalShortTextSchema(80),
  note: optionalShortTextSchema(500),
});

export const updateExpenseSchema = createExpenseSchema
  .partial()
  .extend({
    deleteReceipt: bodyBooleanSchema.optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    'Provide at least one field to update',
  );

export const expenseListQuerySchema = z
  .object({
    scope: z.enum(expenseScopes).optional(),
    cropSeasonId: z.string().uuid().optional(),
    status: z.enum(expenseStatuses).optional(),
    category: z.enum(expenseCategories).optional(),
    recurring: queryBooleanSchema.optional(),
    search: z.string().trim().max(80).optional(),
  })
  .superRefine((value, context) => {
    if (value.scope === 'season' && !value.cropSeasonId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Choose a crop season for season scope',
        path: ['cropSeasonId'],
      });
    }
  });

export const expenseSummaryQuerySchema = z
  .object({
    scope: z.enum(expenseScopes),
    cropSeasonId: z.string().uuid().optional(),
  })
  .superRefine((value, context) => {
    if (value.scope === 'season' && !value.cropSeasonId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Choose a crop season for season scope',
        path: ['cropSeasonId'],
      });
    }
  });

export const expenseBudgetUpsertSchema = z.object({
  cropSeasonId: z.string().uuid(),
  amount: nullablePositiveAmountSchema,
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

export const marketExplorerQuerySchema = z
  .object({
    scope: z.enum(marketExplorerScopes).default('district'),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce.number().int().positive().max(50).optional().default(12),
    search: z.string().trim().max(80).optional(),
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

export const dashboardQuerySchema = weatherLocationQuerySchema.extend({
  cropSeasonId: z.string().uuid().optional(),
});

export const createDiseaseReportSchema = z
  .object({
    cropSeasonId: z.string().uuid().optional(),
    placeLabel: z.string().trim().min(2).max(80).optional(),
    userNote: z.string().trim().max(500).optional(),
    captureMode: z.enum(diseaseCaptureModes).default('CAMERA_DUAL_ANGLE'),
  })
  .superRefine((value, context) => {
    if (!value.cropSeasonId && !value.placeLabel) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Choose a saved crop season or enter a new place label',
        path: ['cropSeasonId'],
      });
    }
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
  focusCropSeasonId: optionalUuidStringSchema,
  focusFarmPlotId: optionalUuidStringSchema,
  originRoute: optionalShortTextSchema(80),
  language: z.enum(preferredLanguages).optional(),
});

export const communityFeedQuerySchema = z.object({
  scope: z.enum(communityFeedScopes).optional(),
  category: z.enum(communityCategories).optional(),
  cursor: z.string().trim().optional(),
  query: z.string().trim().max(80).optional(),
});

export const createCommunityPostSchema = z.object({
  category: z.enum(communityCategories),
  title: z.string().trim().min(4).max(120),
  body: z.string().trim().min(8).max(2000),
  cropSeasonId: optionalUuidStringSchema,
});

export const createCommunityReplySchema = z.object({
  body: z.string().trim().min(2).max(1200),
});

export const reportCommunityContentSchema = z.object({
  targetType: z.enum(communityReportTargets),
  reason: z.enum(communityReportReasons),
  note: z.string().trim().max(300).optional(),
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

export const expenseCropSeasonSummarySchema = z.object({
  id: z.string().uuid(),
  cropName: z.string(),
  currentStage: z.string(),
  sowingDate: z.string(),
  farmPlotId: z.string().uuid(),
  status: z.enum(cropSeasonStatuses),
});

export const expenseEntrySchema = z.object({
  id: z.string().uuid(),
  cropSeasonId: z.string().uuid(),
  title: z.string(),
  amount: z.number(),
  expenseDate: z.string(),
  category: z.enum(expenseCategories),
  status: z.enum(expenseStatuses),
  isRecurring: z.boolean(),
  vendor: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  receiptUrl: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  cropSeason: expenseCropSeasonSummarySchema,
});

export const expenseCategorySummarySchema = z.object({
  category: z.enum(expenseCategories),
  amount: z.number(),
  paidAmount: z.number(),
  pendingAmount: z.number(),
  count: z.number().int().min(0),
  percent: z.number(),
  previousAmount: z.number(),
  deltaAmount: z.number(),
  deltaPercent: z.number().nullable(),
});

export const expenseBudgetSchema = z.object({
  cropSeasonId: z.string().uuid(),
  amount: z.number().positive(),
  spentAmount: z.number(),
  pendingAmount: z.number(),
  remainingAmount: z.number(),
  usedPercent: z.number(),
  updatedAt: z.string(),
});

export const expenseTrendSchema = z.object({
  direction: z.enum(marketTrendDirections),
  percentChange: z.number(),
  deltaAmount: z.number(),
  currentAmount: z.number(),
  previousAmount: z.number(),
  comparisonLabel: z.string(),
});

export const expenseSummarySchema = z.object({
  scope: z.enum(expenseScopes),
  periodLabel: z.string(),
  totalAmount: z.number(),
  paidAmount: z.number(),
  pendingAmount: z.number(),
  entryCount: z.number().int().min(0),
  averageAmount: z.number(),
  categories: z.array(expenseCategorySummarySchema),
  trend: expenseTrendSchema,
  budget: expenseBudgetSchema.nullable(),
});

export const dashboardAlertSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  message: z.string(),
  alertType: z.enum(alertTypes),
  severity: z.enum(severityLevels),
  isRead: z.boolean(),
});

export const weatherFreshnessSchema = z.object({
  capturedAt: z.string(),
  isCached: z.boolean(),
  cacheAgeMinutes: z.number().int().min(0),
  stale: z.boolean(),
});

export const weatherCurrentSchema = z.object({
  temperatureC: z.number(),
  humidityPercent: z.number().min(0).max(100),
  rainfallExpectedMm: z.number(),
  rainProbabilityPercent: z.number().min(0).max(100),
  conditionCode: z.enum(weatherConditionCodes),
  conditionLabel: z.string(),
  feelsLikeC: z.number(),
  windSpeedKph: z.number(),
  updatedAt: z.string(),
});

export const weatherHourlyPointSchema = z.object({
  time: z.string(),
  temperatureC: z.number(),
  rainMm: z.number(),
  rainProbabilityPercent: z.number().min(0).max(100),
  conditionCode: z.enum(weatherConditionCodes),
});

export const weatherDailyPointSchema = z.object({
  date: z.string(),
  maxTemperatureC: z.number(),
  minTemperatureC: z.number(),
  rainfallMm: z.number(),
  conditionCode: z.enum(weatherConditionCodes),
  conditionLabel: z.string(),
});

export const weatherAdvisorySchema = z.object({
  title: z.string(),
  message: z.string(),
  severity: z.enum(severityLevels),
  recommendedAction: z.string(),
  audioSummary: z.string(),
});

export const weatherRiskSignalSchema = z.object({
  level: z.enum(weatherRiskLevels),
  reason: z.string(),
});

export const weatherFieldWindowSchema = z.object({
  status: z.enum(fieldWindowStatuses),
  summary: z.string(),
});

export const weatherSummarySchema = z.object({
  current: weatherCurrentSchema,
  hourly: z.array(weatherHourlyPointSchema),
  daily: z.array(weatherDailyPointSchema),
  advisories: z.array(weatherAdvisorySchema),
  riskSignals: z.object({
    sprayRisk: weatherRiskSignalSchema,
    irrigationNeed: weatherRiskSignalSchema,
    heatStressRisk: weatherRiskSignalSchema,
    floodRisk: weatherRiskSignalSchema,
  }),
  fieldWindows: z.object({
    sprayWindow: weatherFieldWindowSchema,
    irrigationWindow: weatherFieldWindowSchema,
    harvestWindow: weatherFieldWindowSchema,
  }),
  sourceMeta: z.object({
    provider: z.string(),
    locationSource: z.enum(weatherLocationSources),
    locationLabel: z.string(),
    accuracyLabel: z.string(),
    isFallback: z.boolean(),
  }),
  freshness: weatherFreshnessSchema,
});

export const seasonSwitcherItemSchema = z.object({
  cropSeasonId: z.string().uuid(),
  cropName: z.string(),
  currentStage: z.string(),
  farmPlotName: z.string(),
  locationLabel: z.string(),
  stageProgressPercent: z.number().min(0).max(100),
  pendingTaskCount: z.number().int().min(0),
  hasWeather: z.boolean(),
});

export const featuredSeasonSchema = z.object({
  cropSeasonId: z.string().uuid(),
  cropName: z.string(),
  sowingDate: z.string(),
  currentStage: z.string(),
  farmPlotId: z.string().uuid(),
  farmPlotName: z.string(),
  village: z.string(),
  district: z.string(),
  state: z.string(),
  irrigationType: z.enum(irrigationTypes),
  stageProgressPercent: z.number().min(0).max(100),
  daysSinceSowing: z.number().int().min(0),
});

export const taskFocusSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  progressLabel: z.string(),
  pendingCount: z.number().int().min(0),
  completedCount: z.number().int().min(0),
  tasks: z.array(dashboardTaskSchema),
});

export const cropHealthSummarySchema = z.object({
  riskLevel: z.enum(severityLevels),
  headline: z.string(),
  detail: z.string(),
  confidenceBand: z.enum(diseaseConfidenceBands).nullable(),
  latestReportId: z.string().uuid().nullable(),
  ctaLabel: z.string(),
});

export const marketResponseRecordSchema = z.object({
  id: z.string(),
  facilityId: z.string().nullable().optional(),
  cropName: z.string(),
  mandiName: z.string(),
  district: z.string(),
  state: z.string(),
  priceMin: z.number(),
  priceMax: z.number(),
  priceModal: z.number(),
  recordDate: z.string(),
  source: z.string(),
  distanceKm: z.number().nullable(),
  trendDirection: z.enum(marketTrendDirections),
  trendLabel: z.string(),
  deltaFromPrevious: z.number().nullable(),
  freshnessLabel: z.string(),
});

export const marketPulseSchema = z.object({
  cropName: z.string(),
  modalPrice: z.number(),
  mandiName: z.string(),
  distanceKm: z.number().nullable(),
  trendDirection: z.enum(marketTrendDirections),
  trendLabel: z.string(),
  freshnessLabel: z.string(),
  summary: z.string(),
  ctaLabel: z.string(),
});

export const schemeSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  titleHi: z.string().nullable().optional(),
  description: z.string(),
  descriptionHi: z.string().nullable().optional(),
  category: z.string(),
  applicableState: z.string(),
  officialLink: z.string(),
  benefitSummary: z.string(),
  eligibilityTone: z.enum(schemeEligibilityTones),
  priority: z.enum(schemePriorityLevels),
  whyRelevant: z.string(),
  documentsPreview: z.array(z.string()),
  deadlineLabel: z.string(),
});

export const schemeSpotlightSchema = z.object({
  schemeId: z.string().uuid(),
  title: z.string(),
  benefitSummary: z.string(),
  priority: z.enum(schemePriorityLevels),
  whyRelevant: z.string(),
  officialLink: z.string(),
  ctaLabel: z.string(),
});

export const resourcePulseSchema = z.object({
  weeklyWaterMm: z.number(),
  fertilizerNeed: z.string(),
  pesticideNeedLevel: z.enum(['LOW', 'WATCH', 'HIGH']),
  recommendations: z.array(z.string()),
  safetyNote: z.string(),
});

export const dashboardOfflineStateSchema = z.object({
  weatherCacheReady: z.boolean(),
  latestWeatherAt: z.string().nullable(),
  latestAlertAt: z.string().nullable(),
  message: z.string(),
});

export const dashboardResponseSchema = z.object({
  user: userSummarySchema,
  generatedAt: z.string(),
  featuredSeason: featuredSeasonSchema.nullable(),
  seasonSwitcher: z.array(seasonSwitcherItemSchema),
  weatherHero: weatherSummarySchema.nullable(),
  taskFocus: taskFocusSchema.nullable(),
  cropHealth: cropHealthSummarySchema.nullable(),
  marketPulse: marketPulseSchema.nullable(),
  schemeSpotlight: schemeSpotlightSchema.nullable(),
  resourcePulse: resourcePulseSchema.nullable(),
  offlineState: dashboardOfflineStateSchema,
});

export const diseaseResultSchema = z.object({
  predictedIssue: z.string().nullable(),
  confidenceScore: z.number(),
  confidenceBand: z.enum(diseaseConfidenceBands),
  recommendation: z.string(),
  escalationRequired: z.boolean(),
  status: z.enum(diseaseReportStatuses),
  provider: z.string(),
  captureMode: z.enum(diseaseCaptureModes),
  analysisSource: z.enum(diseaseAnalysisSources),
  symptomsDetected: z.array(z.string()),
  possibleCause: z.string(),
  safeFirstAction: z.string(),
  whatNotToDo: z.array(z.string()),
  nextActions: z.array(z.string()),
  escalationReason: z.string().nullable(),
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
  locationLabel: z.string(),
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

export const facilityMarketContextSchema = z.object({
  cropName: z.string(),
  mandiName: z.string(),
  priceMin: z.number(),
  priceMax: z.number(),
  priceModal: z.number(),
  recordDate: z.string(),
  source: z.string(),
  trendDirection: z.enum(marketTrendDirections),
  trendLabel: z.string(),
  freshnessLabel: z.string(),
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
  distanceBucket: z.string(),
  travelHint: z.string(),
  primaryServiceLabel: z.string(),
  services: z.array(z.string()),
  marketContext: facilityMarketContextSchema.nullable(),
  recommendedUse: z.string(),
  latestMarket: facilityMarketContextSchema.nullable(),
});

export const marketsResponseSchema = z.object({
  generatedAt: z.string(),
  cropName: z.string().nullable(),
  records: z.array(marketResponseRecordSchema),
  bestRecord: marketResponseRecordSchema.nullable(),
  recommendedRecord: marketResponseRecordSchema.nullable(),
  topNearby: z.array(marketResponseRecordSchema),
});

export const marketExplorerPageInfoSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalCount: z.number().int().min(0),
  hasMore: z.boolean(),
});

export const marketCropSummarySchema = z.object({
  cropKey: z.string(),
  cropName: z.string(),
  latestRecord: marketResponseRecordSchema.nullable(),
  bestRecord: marketResponseRecordSchema.nullable(),
  nearestRecord: marketResponseRecordSchema.nullable(),
  trendDirection: z.enum(marketTrendDirections).nullable(),
  trendLabel: z.string(),
  freshnessLabel: z.string(),
  mandiCount: z.number().int().min(0),
});

export const marketMandiSummarySchema = z.object({
  mandiKey: z.string(),
  mandiName: z.string(),
  district: z.string(),
  state: z.string(),
  distanceKm: z.number().nullable(),
  cropCount: z.number().int().min(0),
  topRecord: marketResponseRecordSchema.nullable(),
  freshestRecord: marketResponseRecordSchema.nullable(),
  linkedFacilityId: z.string().uuid().nullable(),
  hasLinkedFacility: z.boolean(),
});

export const linkedMandiFacilitySchema = z.object({
  id: z.string().uuid(),
  type: z.enum(facilityTypes),
  name: z.string(),
  district: z.string(),
  state: z.string(),
  village: z.string().nullable().optional(),
  distanceKm: z.number().nullable(),
  distanceBucket: z.string(),
  travelHint: z.string(),
  primaryServiceLabel: z.string(),
  services: z.array(z.string()),
});

export const marketExplorerCropsResponseSchema = z.object({
  generatedAt: z.string(),
  scope: z.enum(marketExplorerScopes),
  pageInfo: marketExplorerPageInfoSchema,
  crops: z.array(marketCropSummarySchema),
});

export const marketExplorerMandisResponseSchema = z.object({
  generatedAt: z.string(),
  scope: z.enum(marketExplorerScopes),
  pageInfo: marketExplorerPageInfoSchema,
  mandis: z.array(marketMandiSummarySchema),
});

export const marketCropDetailSchema = z.object({
  cropKey: z.string(),
  cropName: z.string(),
  scope: z.enum(marketExplorerScopes),
  bestRecord: marketResponseRecordSchema.nullable(),
  nearestRecord: marketResponseRecordSchema.nullable(),
  nearbyRecords: z.array(marketResponseRecordSchema),
  records: z.array(marketResponseRecordSchema),
  mandiCount: z.number().int().min(0),
});

export const marketMandiDetailSchema = z.object({
  mandiKey: z.string(),
  mandiName: z.string(),
  district: z.string(),
  state: z.string(),
  scope: z.enum(marketExplorerScopes),
  distanceKm: z.number().nullable(),
  topRecord: marketResponseRecordSchema.nullable(),
  freshestRecord: marketResponseRecordSchema.nullable(),
  linkedFacility: linkedMandiFacilitySchema.nullable(),
  records: z.array(marketResponseRecordSchema),
  cropCount: z.number().int().min(0),
});

export const marketCropDetailResponseSchema = z.object({
  generatedAt: z.string(),
  crop: marketCropDetailSchema,
});

export const marketMandiDetailResponseSchema = z.object({
  generatedAt: z.string(),
  mandi: marketMandiDetailSchema,
});

export const facilitiesResponseSchema = z.object({
  facilities: z.array(facilitySummarySchema),
});

export const schemesResponseSchema = z.object({
  generatedAt: z.string(),
  schemes: z.array(schemeSummarySchema),
  recommendedSchemeId: z.string().uuid().nullable(),
});

export const assistantSourceSchema = z.object({
  type: z.string(),
  label: z.string(),
  referenceId: z.string().optional(),
});

export const assistantAttachmentSchema = z.object({
  type: z.enum(assistantAttachmentTypes),
  url: z.string(),
  mimeType: z.string(),
  fileName: z.string(),
});

export const assistantActionCardSchema = z.object({
  title: z.string(),
  body: z.string(),
  ctaLabel: z.string(),
  ctaRoute: z.string(),
  tone: z.enum(['weather', 'diagnose', 'market', 'scheme', 'expert', 'task']),
});

export const assistantSuggestedNextStepSchema = z.object({
  label: z.string(),
  ctaLabel: z.string(),
  ctaRoute: z.string(),
});

export const assistantMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(assistantMessageRoles),
  content: z.string(),
  answer: z.string(),
  spokenSummary: z.string(),
  attachments: z.array(assistantAttachmentSchema),
  sources: z.array(assistantSourceSchema),
  safetyLevel: z.enum(assistantSafetyLevels),
  safetyFlags: z.array(z.string()),
  confidenceLabel: z.enum(assistantConfidenceLabels).nullable(),
  actionCards: z.array(assistantActionCardSchema),
  suggestedNextStep: assistantSuggestedNextStepSchema.nullable(),
  createdAt: z.string(),
});

export const assistantThreadSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  updatedAt: z.string(),
  messageCount: z.number().int().min(0),
});

export const assistantThreadSchema = z.object({
  id: z.string().uuid(),
  title: z.string().nullable(),
  updatedAt: z.string(),
  messages: z.array(assistantMessageSchema),
});

export const assistantThreadsResponseSchema = z.object({
  threads: z.array(assistantThreadSummarySchema),
});

export const assistantThreadResponseSchema = z.object({
  thread: assistantThreadSchema,
});

export const assistantMessageResponseSchema = z.object({
  message: assistantMessageSchema,
});

export const communityAuthorSummarySchema = z.object({
  firstName: z.string(),
  profilePhotoUrl: z.string().nullable(),
  village: z.string().nullable(),
  district: z.string().nullable(),
  state: z.string().nullable(),
});

export const communityReplySummarySchema = z.object({
  id: z.string().uuid(),
  body: z.string(),
  createdAt: z.string(),
  author: communityAuthorSummarySchema,
});

export const communityPostSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  category: z.enum(communityCategories),
  cropSeasonId: z.string().uuid().nullable(),
  cropName: z.string().nullable(),
  currentStage: z.string().nullable(),
  imageUrl: z.string().nullable(),
  likeCount: z.number().int().min(0),
  replyCount: z.number().int().min(0),
  saveCount: z.number().int().min(0),
  locked: z.boolean(),
  viewerHasLiked: z.boolean(),
  viewerHasSaved: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: communityAuthorSummarySchema,
});

export const communityPostDetailSchema = communityPostSummarySchema.extend({
  replies: z.array(communityReplySummarySchema),
});

export const communityFeedResponseSchema = z.object({
  scope: z.enum(communityFeedScopes),
  nextCursor: z.string().nullable(),
  posts: z.array(communityPostSummarySchema),
});

export const communityPostResponseSchema = z.object({
  post: communityPostDetailSchema,
});

export const communityPostSummaryResponseSchema = z.object({
  post: communityPostSummarySchema,
});

export const alertSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  message: z.string(),
  alertType: z.enum(alertTypes),
  severity: z.enum(severityLevels),
  isRead: z.boolean(),
  createdAt: z.string(),
  categoryLabel: z.string(),
  iconKey: z.string(),
  ctaLabel: z.string(),
  ctaRoute: z.string(),
  freshnessLabel: z.string(),
});

export const alertsResponseSchema = z.object({
  alerts: z.array(alertSummarySchema),
});

export const diseaseReportSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().optional(),
  cropSeasonId: z.string().uuid().nullable().optional(),
  placeLabel: z.string().nullable().optional(),
  image1Url: z.string().nullable().optional(),
  image2Url: z.string().nullable().optional(),
  voiceNoteUrl: z.string().nullable().optional(),
  userNote: z.string().nullable().optional(),
  cropSeason: z
    .object({
      id: z.string().uuid(),
      cropName: z.string(),
      currentStage: z.string(),
      sowingDate: z.string(),
      farmPlotId: z.string().uuid(),
      status: z.enum(cropSeasonStatuses),
    })
    .nullable()
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  providerRef: z.string().nullable().optional(),
}).extend(diseaseResultSchema.shape);

export const diseaseReportsResponseSchema = z.object({
  reports: z.array(diseaseReportSchema),
});

export const diseaseReportResponseSchema = z.object({
  report: diseaseReportSchema,
});

export const expenseListResponseSchema = z.object({
  expenses: z.array(expenseEntrySchema),
});

export const expenseResponseSchema = z.object({
  expense: expenseEntrySchema,
});

export const expenseSummaryResponseSchema = z.object({
  summary: expenseSummarySchema,
});

export const expenseBudgetResponseSchema = z.object({
  budget: expenseBudgetSchema.nullable(),
});

export const expenseDeleteResponseSchema = z.object({
  success: z.boolean(),
});
