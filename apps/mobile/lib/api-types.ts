import { z } from 'zod';

import type {
  CommunityCategory,
  CommunityFeedScope,
  CommunityReportReason,
  ExpenseCategory,
  ExpenseScope,
  ExpenseStatus,
  PreferredLanguage,
} from '@intellifarm/contracts';
import {
  alertsResponseSchema,
  assistantMessageResponseSchema,
  assistantThreadResponseSchema,
  assistantThreadsResponseSchema,
  communityFeedResponseSchema,
  communityPostResponseSchema,
  communityPostSummaryResponseSchema,
  cropSuggestionPredictionResponseSchema,
  dashboardResponseSchema,
  diseaseReportResponseSchema,
  diseaseReportsResponseSchema,
  diseaseResultSchema,
  expenseBudgetResponseSchema,
  expenseDeleteResponseSchema,
  expenseListResponseSchema,
  expenseResponseSchema,
  expenseSummaryResponseSchema,
  facilitiesResponseSchema,
  marketCropDetailResponseSchema,
  marketExplorerCropsResponseSchema,
  marketExplorerMandisResponseSchema,
  marketMandiDetailResponseSchema,
  marketsResponseSchema,
  schemesResponseSchema,
  weatherSummarySchema,
} from '@intellifarm/contracts';

export type CropSuggestionPredictionResponse = z.infer<
  typeof cropSuggestionPredictionResponseSchema
>;
export type DashboardWeeklyResponse = z.infer<typeof dashboardResponseSchema>;
export type DiseaseAnalysisResult = z.infer<typeof diseaseResultSchema>;
export type WeatherSummary = z.infer<typeof weatherSummarySchema>;
export type MarketsResponse = z.infer<typeof marketsResponseSchema>;
export type FacilitiesResponse = z.infer<typeof facilitiesResponseSchema>;
export type MarketExplorerCropsResponse = z.infer<
  typeof marketExplorerCropsResponseSchema
>;
export type MarketExplorerMandisResponse = z.infer<
  typeof marketExplorerMandisResponseSchema
>;
export type MarketCropDetailResponse = z.infer<
  typeof marketCropDetailResponseSchema
>;
export type MarketMandiDetailResponse = z.infer<
  typeof marketMandiDetailResponseSchema
>;
export type SchemesResponse = z.infer<typeof schemesResponseSchema>;
export type AlertsResponse = z.infer<typeof alertsResponseSchema>;
export type DiseaseReportsResponse = z.infer<typeof diseaseReportsResponseSchema>;
export type DiseaseReportResponse = z.infer<typeof diseaseReportResponseSchema>;
export type AssistantThreadsResponse = z.infer<typeof assistantThreadsResponseSchema>;
export type AssistantThreadResponse = z.infer<typeof assistantThreadResponseSchema>;
export type AssistantMessageResponse = z.infer<typeof assistantMessageResponseSchema>;
export type CommunityFeedResponse = z.infer<typeof communityFeedResponseSchema>;
export type CommunityPostResponse = z.infer<typeof communityPostResponseSchema>;
export type CommunityPostSummaryResponse = z.infer<
  typeof communityPostSummaryResponseSchema
>;
export type ExpenseListResponse = z.infer<typeof expenseListResponseSchema>;
export type ExpenseResponse = z.infer<typeof expenseResponseSchema>;
export type ExpenseSummaryResponse = z.infer<typeof expenseSummaryResponseSchema>;
export type ExpenseBudgetResponse = z.infer<typeof expenseBudgetResponseSchema>;
export type ExpenseDeleteResponse = z.infer<typeof expenseDeleteResponseSchema>;
export type CommunityPost = CommunityFeedResponse['posts'][number];
export type CommunityReply = CommunityPostResponse['post']['replies'][number];
export type ExpenseEntry = ExpenseListResponse['expenses'][number];
export type ExpenseSummary = ExpenseSummaryResponse['summary'];
export type ExpenseBudget = ExpenseBudgetResponse['budget'];
export type CommunityReplyResponse = {
  reply: CommunityReply;
};
export type CommunityReportResponse = {
  success: boolean;
};
export type CommunityCategoryType = CommunityCategory;
export type CommunityFeedScopeType = CommunityFeedScope;
export type CommunityReportReasonType = CommunityReportReason;
export type ExpenseCategoryType = ExpenseCategory;
export type ExpenseStatusType = ExpenseStatus;
export type ExpenseScopeType = ExpenseScope;

export type AuthUser = {
  id: string;
  name: string;
  phone: string;
  preferredLanguage: PreferredLanguage;
  state: string;
  district: string;
  village: string;
  profilePhotoUrl: string | null;
  role: 'FARMER' | 'ADMIN';
  isProfileComplete: boolean;
};

export type OtpRequestResponse = {
  message: string;
  expiresAt: string;
  devOtp?: string;
};

export type OtpVerifyResponse = {
  user: AuthUser;
  needsOnboarding: boolean;
  accessToken: string;
};

export type AuthMeResponse = {
  user: AuthUser;
};

export type ProfileResponse = {
  user: AuthUser;
  farmCount: number;
  farms: FarmPlot[];
};

export type FarmPlot = {
  id: string;
  userId: string;
  name: string;
  state: string;
  district: string;
  village: string;
  area: number;
  latitude?: number | null;
  longitude?: number | null;
  irrigationType: string;
  soilType?: string | null;
  cropSeasons: CropSeasonSummary[];
};

export type CropSeasonSummary = {
  id: string;
  farmPlotId: string;
  cropDefinitionId: string;
  cropName: string;
  sowingDate: string;
  currentStage: string;
  status: 'PLANNED' | 'ACTIVE' | 'HARVESTED' | 'ARCHIVED';
};

export type CropDefinitionsResponse = {
  cropDefinitions: Array<{
    id: string;
    slug: string;
    nameEn: string;
    nameHi: string;
  }>;
};

export type FarmPlotsResponse = {
  farmPlots: FarmPlot[];
};

export type CropSeasonResponse = {
  cropSeason: {
    id: string;
    cropName: string;
    currentStage: string;
    sowingDate: string;
    farmPlotId: string;
    farmPlot: FarmPlot;
    tasks: TaskItem[];
    diseaseReports: DiseaseReport[];
    cropDefinition: {
      stageRules: TimelineStage[];
    };
  };
};

export type TimelineStage = {
  id: string;
  stageKey: string;
  labelEn: string;
  labelHi: string;
  startDay: number;
  endDay: number;
  sortOrder: number;
};

export type CropTimelineResponse = {
  cropSeason: CropSeasonResponse['cropSeason'];
  stages: TimelineStage[];
  tasks: TaskItem[];
};

export type TaskItem = {
  id: string;
  cropSeasonId?: string;
  title: string;
  description: string;
  dueDate: string;
  taskType: 'IRRIGATION' | 'FERTILIZER' | 'SCOUTING' | 'HARVEST_PREP' | 'GENERAL';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED' | 'OVERDUE';
};

export type WeatherResponse = {
  weather: WeatherSummary;
};

export type ResourcePredictionResponse = {
  prediction: {
    id: string;
    type: 'RESOURCE_ESTIMATE';
    provider: string;
    status: 'COMPLETED' | 'FAILED';
    createdAt: string;
  };
  resourcePrediction: {
    cropName: string;
    currentStage: string;
    weeklyWaterMm: number;
    fertilizerNeed: string;
    pesticideNeedLevel: 'LOW' | 'WATCH' | 'HIGH';
    recommendations: string[];
    safetyNote: string;
  };
  weather: {
    currentTemperatureC: number;
    humidityPercent: number;
    rainfallExpectedMm: number;
  };
};

export type CropSuggestionResponse = CropSuggestionPredictionResponse;

export type MarketRecord = MarketsResponse['records'][number];

export type DiseaseReport = DiseaseAnalysisResult & {
  id: string;
  userId?: string;
  cropSeasonId?: string | null;
  placeLabel?: string | null;
  image1Url?: string | null;
  image2Url?: string | null;
  voiceNoteUrl?: string | null;
  userNote?: string | null;
  cropSeason?: CropSeasonSummary | null;
  createdAt: string;
  updatedAt?: string;
  providerRef?: string | null;
};
