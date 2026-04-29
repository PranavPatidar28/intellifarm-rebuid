export const preferredLanguages = ['en', 'hi'] as const;
export type PreferredLanguage = (typeof preferredLanguages)[number];

export const userRoles = ['FARMER', 'ADMIN'] as const;
export type UserRole = (typeof userRoles)[number];

export const irrigationTypes = ['RAIN_FED', 'DRIP', 'SPRINKLER', 'FLOOD', 'MANUAL'] as const;
export type IrrigationType = (typeof irrigationTypes)[number];

export const soilTypes = [
  'ALLUVIAL',
  'BLACK_REGUR',
  'RED',
  'LATERITE',
  'SANDY',
  'CLAY_HEAVY',
  'LOAMY_MIXED',
  'NOT_SURE',
] as const;
export type SoilType = (typeof soilTypes)[number];

export const seasonKeys = ['KHARIF', 'RABI', 'ZAID', 'CUSTOM'] as const;
export type SeasonKey = (typeof seasonKeys)[number];

export const cropSeasonStatuses = ['PLANNED', 'ACTIVE', 'HARVESTED', 'ARCHIVED'] as const;
export type CropSeasonStatus = (typeof cropSeasonStatuses)[number];

export const taskTypes = ['IRRIGATION', 'FERTILIZER', 'SCOUTING', 'HARVEST_PREP', 'GENERAL'] as const;
export type TaskType = (typeof taskTypes)[number];

export const taskPriorities = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type TaskPriority = (typeof taskPriorities)[number];

export const taskStatuses = ['PENDING', 'COMPLETED', 'SKIPPED', 'OVERDUE'] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export const expenseCategories = [
  'FERTILIZER',
  'LABOUR',
  'EQUIPMENT',
  'TRANSPORT',
  'SEEDS',
  'PESTICIDE',
  'IRRIGATION',
  'OTHER',
] as const;
export type ExpenseCategory = (typeof expenseCategories)[number];

export const expenseStatuses = ['PAID', 'PENDING'] as const;
export type ExpenseStatus = (typeof expenseStatuses)[number];

export const expenseScopes = ['month', 'season', 'year'] as const;
export type ExpenseScope = (typeof expenseScopes)[number];

export const alertTypes = ['WEATHER', 'TASK', 'DISEASE', 'SYSTEM', 'COMMUNITY'] as const;
export type AlertType = (typeof alertTypes)[number];

export const communityCategories = [
  'QUESTION',
  'PEST_DISEASE',
  'WATER',
  'NUTRITION',
  'MARKET',
  'SUCCESS',
  'WARNING',
] as const;
export type CommunityCategory = (typeof communityCategories)[number];

export const communityFeedScopes = [
  'FOR_YOU',
  'NEARBY',
  'TRENDING',
  'MY_POSTS',
  'SAVED',
] as const;
export type CommunityFeedScope = (typeof communityFeedScopes)[number];

export const communityReportTargets = ['POST', 'REPLY'] as const;
export type CommunityReportTarget = (typeof communityReportTargets)[number];

export const communityReportReasons = [
  'MISLEADING',
  'ABUSIVE',
  'UNSAFE',
  'SPAM',
  'OTHER',
] as const;
export type CommunityReportReason = (typeof communityReportReasons)[number];

export const severityLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type Severity = (typeof severityLevels)[number];

export const diseaseReportStatuses = ['PENDING', 'ANALYZED', 'ESCALATED'] as const;
export type DiseaseReportStatus = (typeof diseaseReportStatuses)[number];

export const facilityTypes = ['MANDI', 'WAREHOUSE'] as const;
export type FacilityType = (typeof facilityTypes)[number];

export const predictionTypes = ['CROP_SUGGESTION', 'RESOURCE_ESTIMATE'] as const;
export type PredictionType = (typeof predictionTypes)[number];

export const predictionStatuses = ['COMPLETED', 'FAILED'] as const;
export type PredictionStatus = (typeof predictionStatuses)[number];

export const predictionInputConfidenceLevels = ['HIGH', 'MEDIUM', 'LOW'] as const;
export type PredictionInputConfidenceLevel =
  (typeof predictionInputConfidenceLevels)[number];

export const soilProfileSources = [
  'ADVANCED_METRICS',
  'PAGE_SOIL_TYPE',
  'PLOT_SAVED_SOIL_TYPE',
  'UNKNOWN_DEFAULT',
] as const;
export type SoilProfileSource = (typeof soilProfileSources)[number];

export const seasonClimateMethods = [
  'HISTORICAL_MONTHLY',
  'CURRENT_FALLBACK',
] as const;
export type SeasonClimateMethod = (typeof seasonClimateMethods)[number];

export const assistantMessageRoles = ['USER', 'ASSISTANT'] as const;
export type AssistantMessageRole = (typeof assistantMessageRoles)[number];

export const assistantAttachmentTypes = ['image'] as const;
export type AssistantAttachmentType = (typeof assistantAttachmentTypes)[number];

export const assistantConfidenceLabels = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'GENERAL',
  'ROUTED',
] as const;
export type AssistantConfidenceLabel =
  (typeof assistantConfidenceLabels)[number];

export const diseaseCaptureModes = ['STANDARD', 'CAMERA_DUAL_ANGLE'] as const;
export type DiseaseCaptureMode = (typeof diseaseCaptureModes)[number];

export const diseaseAnalysisSources = ['MOCK_PROVIDER', 'LIVE_PROVIDER'] as const;
export type DiseaseAnalysisSource = (typeof diseaseAnalysisSources)[number];

export const weatherLocationSources = [
  'DEVICE_GPS',
  'FARM_PLOT',
  'STATE_FALLBACK',
  'COUNTRY_FALLBACK',
  'SNAPSHOT_FALLBACK',
  'SAFE_FALLBACK',
] as const;
export type WeatherLocationSource = (typeof weatherLocationSources)[number];

export const weatherConditionCodes = [
  'CLEAR',
  'PARTLY_CLOUDY',
  'CLOUDY',
  'FOG',
  'LIGHT_RAIN',
  'RAIN',
  'HEAVY_RAIN',
  'STORM',
  'HEAT',
  'UNKNOWN',
] as const;
export type WeatherConditionCode = (typeof weatherConditionCodes)[number];

export const weatherRiskLevels = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type WeatherRiskLevel = (typeof weatherRiskLevels)[number];

export const fieldWindowStatuses = ['GOOD', 'CAUTION', 'AVOID'] as const;
export type FieldWindowStatus = (typeof fieldWindowStatuses)[number];

export const marketTrendDirections = ['UP', 'DOWN', 'STABLE'] as const;
export type MarketTrendDirection = (typeof marketTrendDirections)[number];

export const marketExplorerScopes = ['district', 'state'] as const;
export type MarketExplorerScope = (typeof marketExplorerScopes)[number];

export const schemeEligibilityTones = [
  'LIKELY_ELIGIBLE',
  'CHECK_DETAILS',
  'NOT_ELIGIBLE',
] as const;
export type SchemeEligibilityTone =
  (typeof schemeEligibilityTones)[number];

export const schemePriorityLevels = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type SchemePriorityLevel = (typeof schemePriorityLevels)[number];

export const diseaseConfidenceBands = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type DiseaseConfidenceBand = (typeof diseaseConfidenceBands)[number];

export const assistantSafetyLevels = ['INFO', 'CAUTION', 'ESCALATE'] as const;
export type AssistantSafetyLevel = (typeof assistantSafetyLevels)[number];
