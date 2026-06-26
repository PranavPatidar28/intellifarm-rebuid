import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { tool } from 'ai';
import type { FunctionDeclaration } from '@google/genai';
import type { IrrigationType, SoilType } from '@prisma/client';
import { z } from 'zod';

import { AlertsService } from '../alerts/alerts.service';
import { CropSeasonsService } from '../crop-seasons/crop-seasons.service';
import {
  DISEASE_PROVIDER,
  type DiseaseProvider,
} from '../disease-reports/disease-provider';
import { DevicesService } from '../devices/devices.service';
import { ExpensesService } from '../expenses/expenses.service';
import { FarmsService } from '../farms/farms.service';
import { MarketsService } from '../markets/markets.service';
import { PredictionsService } from '../predictions/predictions.service';
import { PrismaService } from '../prisma/prisma.service';
import { SchemesService } from '../schemes/schemes.service';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../users/users.service';
import { WeatherService } from '../weather/weather.service';
import { AssistantInteractionLogService } from './assistant-interaction-log.service';
import type {
  AssistantHistoryMessage,
  AssistantToolExecutionContext,
  AssistantToolResult,
  PendingVoiceAction,
} from './assistant.types';

type ToolDefinition<TSchema extends z.ZodTypeAny = z.ZodTypeAny> = {
  name: string;
  description: string;
  schema: TSchema;
  jsonSchema: Record<string, unknown>;
  execute: (
    args: any,
    context: AssistantToolExecutionContext,
  ) => Promise<AssistantToolResult>;
};

type ToolExecutionObserver = (
  toolName: string,
  result: AssistantToolResult,
) => void;

const NO_ARGS_SCHEMA = z.object({});
const supportedImageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];

@Injectable()
export class AssistantToolRegistryService {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly cropSeasonsService: CropSeasonsService,
    private readonly devicesService: DevicesService,
    private readonly expensesService: ExpensesService,
    private readonly farmsService: FarmsService,
    private readonly interactionLogService: AssistantInteractionLogService,
    private readonly marketsService: MarketsService,
    private readonly predictionsService: PredictionsService,
    private readonly prisma: PrismaService,
    private readonly schemesService: SchemesService,
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
    private readonly weatherService: WeatherService,
    @Inject(DISEASE_PROVIDER)
    private readonly diseaseProvider: DiseaseProvider,
  ) {}

  getToolDeclarations(): FunctionDeclaration[] {
    return this.getDefinitions().map((definition) => ({
      name: definition.name,
      description: definition.description,
      parametersJsonSchema: definition.jsonSchema,
    }));
  }

  createAiSdkTools(
    context: AssistantToolExecutionContext,
    observer?: ToolExecutionObserver,
  ) {
    const tools = this.getDefinitions().map((definition) => [
      definition.name,
      (tool as any)({
        description: definition.description,
        parameters: definition.schema,
        execute: async (args: any) => {
          const result = await this.execute(definition.name, args, context);
          observer?.(definition.name, result);
          return result;
        },
      }),
    ]);

    return Object.fromEntries(tools);
  }

  async execute(
    toolName: string,
    rawArgs: unknown,
    context: AssistantToolExecutionContext,
  ) {
    const definition = this.getDefinition(toolName);
    const parsedArgs = definition.schema.parse(rawArgs);
    const result = await definition.execute(parsedArgs, context);

    if (result.contextUpdates) {
      Object.assign(context.session, result.contextUpdates);
    }

    return result;
  }

  async executePendingConfirmation(
    action: PendingVoiceAction,
    context: AssistantToolExecutionContext,
  ) {
    if (!isDeviceControlTool(action.toolName)) {
      return failure(
        'unsupported_confirmation',
        'Unsupported confirmation action.',
      );
    }

    return this.execute(action.toolName, action.parameters, {
      ...context,
      allowSideEffects: true,
      session: {
        ...context.session,
        pendingConfirmation: action,
      },
    });
  }

  private getDefinition(toolName: string) {
    const definition = this.getDefinitions().find(
      (item) => item.name === toolName,
    );

    if (!definition) {
      throw new NotFoundException(
        `Assistant tool "${toolName}" is not registered.`,
      );
    }

    return definition;
  }

  private getDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'getFarmerProfile',
        description:
          'Get the authenticated farmer profile and basic farm summary.',
        schema: NO_ARGS_SCHEMA,
        jsonSchema: emptyObjectJsonSchema(),
        execute: async (_args, context) => {
          const profile = await this.usersService.getCurrentUser(
            context.session.userId,
          );
          return success(profile, {
            detectedLanguage: profile.user.preferredLanguage,
          });
        },
      },
      {
        name: 'getFarmDetails',
        description:
          'Get details for a farm plot, its active crop seasons, and upcoming tasks.',
        schema: z.object({
          farmPlotId: z.string().optional(),
        }),
        jsonSchema: objectJsonSchema({
          farmPlotId: stringJsonSchema('Saved farm plot id to inspect.'),
        }),
        execute: async ({ farmPlotId }, context) => {
          const plotId = await this.resolveFarmPlotId(context, farmPlotId);
          if (!plotId) {
            return unavailable(
              'farm_not_selected',
              'No saved farm plot is available yet. Please add or select a farm first.',
            );
          }

          const farm = await this.farmsService.getFarmPlot(
            context.session.userId,
            plotId,
          );
          const latestSeason = farm.farmPlot.cropSeasons[0] ?? null;

          return success(farm, {
            focusFarmPlotId: farm.farmPlot.id,
            activeFarmName: farm.farmPlot.name,
            focusCropSeasonId:
              latestSeason?.id ?? context.session.focusCropSeasonId ?? null,
            activeCropName:
              latestSeason?.cropName ?? context.session.activeCropName ?? null,
          });
        },
      },
      {
        name: 'getWeather',
        description:
          'Get the latest field weather and advisories for a farm plot.',
        schema: z.object({
          farmPlotId: z.string().optional(),
        }),
        jsonSchema: objectJsonSchema({
          farmPlotId: stringJsonSchema(
            'Saved farm plot id to inspect weather for.',
          ),
        }),
        execute: async ({ farmPlotId }, context) => {
          const plotId = await this.resolveFarmPlotId(context, farmPlotId);
          if (!plotId) {
            return unavailable(
              'farm_not_selected',
              'I need a saved farm plot to check weather for this farmer.',
            );
          }

          const weather = await this.weatherService.getPlotWeather(
            context.session.userId,
            plotId,
          );

          return success(weather, { focusFarmPlotId: plotId });
        },
      },
      {
        name: 'getSoilSensorData',
        description:
          'Get the latest soil moisture and smart irrigation telemetry for a farm plot.',
        schema: z.object({
          farmPlotId: z.string().optional(),
        }),
        jsonSchema: objectJsonSchema({
          farmPlotId: stringJsonSchema(
            'Saved farm plot id to inspect telemetry for.',
          ),
        }),
        execute: async ({ farmPlotId }, context) => {
          const plotId = await this.resolveFarmPlotId(context, farmPlotId);
          if (!plotId) {
            return unavailable(
              'farm_not_selected',
              'I need a farm plot before I can fetch soil sensor readings.',
            );
          }

          const device = await this.devicesService.getPlotDevice(
            context.session.userId,
            plotId,
          );
          if (!device.device?.latestReading) {
            return unavailable(
              'sensor_data_unavailable',
              'No live soil sensor reading is available for that farm plot yet.',
            );
          }

          return success(
            {
              device: device.device,
              latestReading: device.device.latestReading,
            },
            { focusFarmPlotId: plotId },
          );
        },
      },
      {
        name: 'getCropRecommendation',
        description: `Recommend suitable crops for a farmer using the IntelliFarm Smart Context Engine and ML prediction model. The tool accepts many optional parameters which you should fill in as intelligently as possible:

CRITICAL USAGE RULES:
1. If the farmer has a saved farm plot, pass farmPlotId — the backend auto-resolves location, soil, irrigation, and farm size from the database. You do NOT need to pass those fields.
2. If no farm plot is available, use explorerContext fields (state, district, irrigationType, farmSizeAcre). Use the farmer's profile state/district as defaults.
3. The system prompt provides 'focusFarmPlotId' — use it directly if available.
4. Season is auto-detected from today's date if not specified. Only pass seasonKey if the farmer explicitly asks about a different season.
5. waterSupplyLevel maps to: PLENTY (canal/bore, reliable), MODERATE (available but gaps), LIMITED (monsoon-dependent), SCARCE (rain-fed). Infer from irrigationType if farmer doesn't specify: DRIP/SPRINKLER→PLENTY, FLOOD→MODERATE, MANUAL→LIMITED, RAIN_FED→SCARCE.
6. Weather and climate data are fetched automatically by the backend using 5-year historical averages for the full crop season window. Do NOT try to pass weather data.
7. After getting results, present them conversationally: name each recommended crop, highlight the best one, mention estimated profit, yield, and risk. Mention any crop to avoid. Summarize key assumptions briefly.`,
        schema: z.object({
          farmPlotId: z.string().optional(),
          state: z.string().optional(),
          district: z.string().optional(),
          village: z.string().optional(),
          irrigationType: z
            .enum(['RAIN_FED', 'DRIP', 'SPRINKLER', 'FLOOD', 'MANUAL'])
            .optional(),
          soilType: z
            .enum([
              'ALLUVIAL',
              'BLACK_REGUR',
              'RED',
              'LATERITE',
              'SANDY',
              'CLAY_HEAVY',
              'LOAMY_MIXED',
              'NOT_SURE',
            ])
            .optional(),
          seasonKey: z.enum(['KHARIF', 'RABI', 'ZAID']).optional(),
          sowingMonth: z.number().int().min(1).max(12).optional(),
          waterSupplyLevel: z
            .enum(['PLENTY', 'MODERATE', 'LIMITED', 'SCARCE'])
            .optional(),
          farmSizeAcre: z.number().positive().optional(),
        }),
        jsonSchema: objectJsonSchema({
          farmPlotId: stringJsonSchema(
            'Saved farm plot id. If provided, location/soil/irrigation/size are auto-filled from the database. Use the focusFarmPlotId from system context when available.',
          ),
          state: stringJsonSchema(
            'Farmer state for explorer mode (when no farm plot is saved). E.g. "Madhya Pradesh".',
          ),
          district: stringJsonSchema(
            'Farmer district for explorer mode. E.g. "Bhopal".',
          ),
          village: stringJsonSchema('Farmer village for explorer mode.'),
          irrigationType: enumJsonSchema(
            ['RAIN_FED', 'DRIP', 'SPRINKLER', 'FLOOD', 'MANUAL'],
            'Irrigation type for explorer mode.',
          ),
          soilType: enumJsonSchema(
            [
              'ALLUVIAL',
              'BLACK_REGUR',
              'RED',
              'LATERITE',
              'SANDY',
              'CLAY_HEAVY',
              'LOAMY_MIXED',
              'NOT_SURE',
            ],
            'Soil type override. Only pass if farmer explicitly mentions it.',
          ),
          seasonKey: enumJsonSchema(
            ['KHARIF', 'RABI', 'ZAID'],
            'Season to optimize for. Auto-detected from current date if not specified.',
          ),
          sowingMonth: numberJsonSchema(
            'Sowing month (1–12). Defaults based on season: KHARIF=6, RABI=11, ZAID=3.',
          ),
          waterSupplyLevel: enumJsonSchema(
            ['PLENTY', 'MODERATE', 'LIMITED', 'SCARCE'],
            'Water availability. Infer from irrigationType if farmer does not specify: DRIP/SPRINKLER→PLENTY, FLOOD→MODERATE, MANUAL→LIMITED, RAIN_FED→SCARCE.',
          ),
          farmSizeAcre: numberJsonSchema(
            'Farm size in acres for explorer mode. Use a sensible default (2.5) if unknown.',
          ),
        }),
        execute: async (args, context) => {
          const plotId = await this.resolveFarmPlotId(context, args.farmPlotId);

          // Infer water supply level from irrigation type if not explicitly provided
          const inferredWaterSupply =
            args.waterSupplyLevel ??
            inferWaterSupplyFromIrrigation(args.irrigationType);

          // Build the season profile with smart defaults
          const seasonKey = args.seasonKey ?? inferSeasonKey();
          const defaultSowingMonths: Record<string, number> = {
            KHARIF: 6,
            RABI: 11,
            ZAID: 3,
          };
          const sowingMonth =
            args.sowingMonth ??
            defaultSowingMonths[seasonKey] ??
            new Date().getMonth() + 1;

          const prediction =
            await this.predictionsService.predictCropSuggestions(
              context.session.userId,
              {
                farmPlotId: plotId ?? undefined,
                explorerContext:
                  plotId == null
                    ? {
                        state: args.state ?? '',
                        district: args.district,
                        village: args.village,
                        irrigationType: (args.irrigationType ??
                          'MANUAL') as IrrigationType,
                        farmSizeAcre: args.farmSizeAcre,
                      }
                    : undefined,
                soilType: (args.soilType as SoilType | undefined) ?? undefined,
                waterSupplyLevel: inferredWaterSupply,
                seasonProfile: {
                  seasonKey,
                  sowingMonth,
                },
              },
            );

          return success(prediction, {
            focusFarmPlotId: plotId ?? context.session.focusFarmPlotId ?? null,
          });
        },
      },
      {
        name: 'detectCropDisease',
        description:
          'Analyze crop disease or stress from dual-angle crop images.',
        schema: z.object({
          cropName: z.string().optional(),
          diseasedImageBase64: z.string().optional(),
          healthyImageBase64: z.string().optional(),
          userNote: z.string().optional(),
        }),
        jsonSchema: objectJsonSchema({
          cropName: stringJsonSchema('Crop name to analyze.'),
          diseasedImageBase64: stringJsonSchema(
            'Base64 image for the diseased crop photo, or the string LATEST.',
          ),
          healthyImageBase64: stringJsonSchema(
            'Base64 image for the healthy or reference crop photo, or the string LATEST.',
          ),
          userNote: stringJsonSchema(
            'Farmer notes about the visible symptoms.',
          ),
        }),
        execute: async (args, context) => {
          const latestCropName = await this.resolveCropName(
            context,
            args.cropName,
          );
          const latestDiseasedImage = resolveImagePayload(
            args.diseasedImageBase64,
            context.historyMessages,
            'latest',
          );
          const latestHealthyImage = resolveImagePayload(
            args.healthyImageBase64,
            context.historyMessages,
            'first',
          );

          if (!latestCropName) {
            return unavailable(
              'crop_name_required',
              'I need the crop name before I can run disease detection.',
            );
          }

          if (!latestDiseasedImage || !latestHealthyImage) {
            return {
              ok: false,
              requiresImages: {
                message:
                  'Disease detection needs both a diseased photo and a healthy or reference crop photo.',
                acceptedMimeTypes: supportedImageMimeTypes,
              },
            };
          }

          const diseasedFile = base64ToMulterFile(
            latestDiseasedImage,
            'diseasedImage',
            'diseased.jpg',
          );
          const cropFile = base64ToMulterFile(
            latestHealthyImage,
            'cropImage',
            'reference.jpg',
          );

          const analysis = await this.diseaseProvider.analyzeDualAngleImages({
            cropName: latestCropName,
            userNote: args.userNote,
            captureMode: 'CAMERA_DUAL_ANGLE',
            images: [diseasedFile, cropFile],
            diseasedImage: diseasedFile,
            cropImage: cropFile,
          });

          return success(analysis, {
            activeCropName: latestCropName,
          });
        },
      },
      {
        name: 'getMarketRates',
        description: `Get recent mandi market rates for a crop.
CRITICAL USAGE RULES:
1. Always state the mandi name, exact distance (if available), and modal price.
2. Mention the price trend (UP/DOWN/STABLE) and record freshness.
3. Highlight the closest mandis from 'topNearby'.
4. Compare the closest mandi with the 'recommendedRecord' to give travel vs. price trade-off advice.`,
        schema: z.object({
          cropName: z.string(),
          state: z.string().optional(),
          district: z.string().optional(),
          bestPriceOnly: z.boolean().optional(),
        }),
        jsonSchema: objectJsonSchema(
          {
            cropName: stringJsonSchema(
              'Crop name to look up in mandi records.',
            ),
            state: stringJsonSchema('State override for mandi search.'),
            district: stringJsonSchema('District override for mandi search.'),
            bestPriceOnly: booleanJsonSchema(
              'Return only the best priced market result.',
            ),
          },
          ['cropName'],
        ),
        execute: async (
          { cropName, state, district, bestPriceOnly },
          context,
        ) => {
          let latitude: number | undefined;
          let longitude: number | undefined;

          const farmId = context.session.focusFarmPlotId;
          if (farmId) {
            try {
              const farmData = await this.farmsService.getFarmPlot(
                context.session.userId,
                farmId,
              );
              if (
                farmData.farmPlot.latitude != null &&
                farmData.farmPlot.longitude != null
              ) {
                latitude = farmData.farmPlot.latitude;
                longitude = farmData.farmPlot.longitude;
              }
            } catch {
              // Ignore if farm not found or unauthorized
            }
          }

          const marketData = await this.marketsService.listMarkets(
            context.session.userId,
            {
              cropName,
              state,
              district,
              bestPriceOnly,
              includeDistance: true,
              latitude,
              longitude,
            },
          );

          return success(marketData, {
            activeCropName: cropName,
          });
        },
      },
      {
        name: 'turnPumpOn',
        description: 'Turn on the irrigation pump for the farmer.',
        schema: z.object({
          farmPlotId: z.string().optional(),
          reason: z.string().optional(),
        }),
        jsonSchema: objectJsonSchema({
          farmPlotId: stringJsonSchema(
            'Farm plot id whose pump should be turned on.',
          ),
          reason: stringJsonSchema(
            'Optional reason to store with the pump command.',
          ),
        }),
        execute: async (args, context) =>
          this.executePumpCommand('turnPumpOn', 'FORCE_ON', args, context),
      },
      {
        name: 'turnPumpOff',
        description: 'Turn off the irrigation pump for the farmer.',
        schema: z.object({
          farmPlotId: z.string().optional(),
          reason: z.string().optional(),
        }),
        jsonSchema: objectJsonSchema({
          farmPlotId: stringJsonSchema(
            'Farm plot id whose pump should be turned off.',
          ),
          reason: stringJsonSchema(
            'Optional reason to store with the pump command.',
          ),
        }),
        execute: async (args, context) =>
          this.executePumpCommand('turnPumpOff', 'FORCE_OFF', args, context),
      },
      {
        name: 'setPumpAuto',
        description:
          'Set the irrigation pump to automatic mode. In auto mode the system turns the pump on or off based on soil moisture sensor thresholds.',
        schema: z.object({
          farmPlotId: z.string().optional(),
          reason: z.string().optional(),
        }),
        jsonSchema: objectJsonSchema({
          farmPlotId: stringJsonSchema(
            'Farm plot id whose pump should be set to auto mode.',
          ),
          reason: stringJsonSchema(
            'Optional reason to store with the pump command.',
          ),
        }),
        execute: async (args, context) =>
          this.executePumpCommand('setPumpAuto', 'AUTO' as any, args, context),
      },
      {
        name: 'getIrrigationStatus',
        description:
          'Get current pump state, pending commands, and irrigation device health.',
        schema: z.object({
          farmPlotId: z.string().optional(),
        }),
        jsonSchema: objectJsonSchema({
          farmPlotId: stringJsonSchema(
            'Farm plot id to inspect irrigation status for.',
          ),
        }),
        execute: async ({ farmPlotId }, context) => {
          const plotId = await this.resolveFarmPlotId(context, farmPlotId);
          if (!plotId) {
            return unavailable(
              'farm_not_selected',
              'I need a farm plot before I can check irrigation status.',
            );
          }

          const device = await this.devicesService.getPlotDevice(
            context.session.userId,
            plotId,
          );
          if (!device.device) {
            return unavailable(
              'device_not_found',
              'No smart irrigation device is registered for that farm plot yet.',
            );
          }

          return success(device, { focusFarmPlotId: plotId });
        },
      },
      {
        name: 'getPreviousAlerts',
        description: 'Get recent IntelliFarm alerts for the current farmer.',
        schema: z.object({
          limit: z.number().int().min(1).max(20).optional(),
        }),
        jsonSchema: objectJsonSchema({
          limit: numberJsonSchema('Maximum number of recent alerts to return.'),
        }),
        execute: async ({ limit }, context) => {
          const alerts = await this.alertsService.listAlerts(
            context.session.userId,
          );
          return success({
            alerts: alerts.alerts.slice(0, limit ?? 5),
          });
        },
      },
      {
        name: 'logFarmerQuery',
        description:
          'Persist an interaction summary for debugging, QA, or support handoff without storing raw audio.',
        schema: z.object({
          userQuery: z.string(),
          assistantSummary: z.string().optional(),
          detectedLanguage: z.string().optional(),
          actionOutcome: z.string().optional(),
        }),
        jsonSchema: objectJsonSchema(
          {
            userQuery: stringJsonSchema(
              'Farmer query or transcript summary to log.',
            ),
            assistantSummary: stringJsonSchema(
              'Assistant reply or summary to log.',
            ),
            detectedLanguage: stringJsonSchema(
              'Detected language code or label.',
            ),
            actionOutcome: stringJsonSchema(
              'Outcome of any farm action or recommendation.',
            ),
          },
          ['userQuery'],
        ),
        execute: async (
          { userQuery, assistantSummary, actionOutcome, detectedLanguage },
          context,
        ) => {
          const record = await this.interactionLogService.createLog(
            {
              ...context.session,
              detectedLanguage:
                detectedLanguage ?? context.session.detectedLanguage ?? null,
            },
            {
              userQuery,
              assistantSummary,
              actionOutcome,
              metadata: {
                source: 'tool',
              },
            },
          );

          return success({
            logId: record.id,
          });
        },
      },
      {
        name: 'getGovernmentSchemes',
        description:
          'Find applicable government schemes, subsidies, insurance, and support programmes for the farmer based on their state, crop, or category.',
        schema: z.object({
          category: z.string().optional(),
          cropName: z.string().optional(),
          search: z.string().optional(),
        }),
        jsonSchema: objectJsonSchema({
          category: stringJsonSchema(
            'Scheme category to filter by (e.g. insurance, subsidy, credit).',
          ),
          cropName: stringJsonSchema(
            'Crop name to find crop-specific schemes.',
          ),
          search: stringJsonSchema('Free-text search keyword.'),
        }),
        execute: async ({ category, cropName, search }, context) => {
          const schemes = await this.schemesService.listSchemes(
            context.session.userId,
            {
              category,
              cropName: cropName ?? context.session.activeCropName ?? undefined,
              search,
              language:
                context.session.preferredLanguage === 'hi' ? 'hi' : 'en',
            },
          );

          return success(schemes);
        },
      },
      {
        name: 'getFarmTasks',
        description:
          'Get upcoming and pending farm tasks such as fertilizer application, spraying, irrigation, and harvesting deadlines for the active crop season.',
        schema: z.object({
          cropSeasonId: z.string().optional(),
        }),
        jsonSchema: objectJsonSchema({
          cropSeasonId: stringJsonSchema(
            'Crop season id to fetch tasks for. Uses the active season if omitted.',
          ),
        }),
        execute: async ({ cropSeasonId }, context) => {
          const seasonId =
            cropSeasonId ?? context.session.focusCropSeasonId ?? null;
          if (!seasonId) {
            return unavailable(
              'season_not_selected',
              'I need an active crop season before I can fetch farm tasks. Please select a farm first.',
            );
          }

          const tasks = await this.tasksService.listTasks(
            context.session.userId,
            seasonId,
          );

          return success(tasks, {
            focusCropSeasonId: seasonId,
          });
        },
      },
      {
        name: 'updateTaskStatus',
        description:
          'Mark a farm task as completed, skipped, or pending. Use this when the farmer says they finished a task.',
        schema: z.object({
          taskId: z.string(),
          status: z.enum(['COMPLETED', 'SKIPPED', 'PENDING']),
        }),
        jsonSchema: objectJsonSchema(
          {
            taskId: stringJsonSchema('The task id to update.'),
            status: enumJsonSchema(
              ['COMPLETED', 'SKIPPED', 'PENDING'],
              'New status for the task.',
            ),
          },
          ['taskId', 'status'],
        ),
        execute: async ({ taskId, status }, context) => {
          const result = await this.tasksService.updateTaskStatus(
            context.session.userId,
            taskId,
            { status },
          );

          return success(result);
        },
      },
      {
        name: 'getExpenseSummary',
        description:
          'Get a spending breakdown and expense summary for the farmer. Can show totals by month, season, or year with category-level detail and budget tracking.',
        schema: z.object({
          scope: z.enum(['month', 'season', 'year']).optional(),
          cropSeasonId: z.string().optional(),
        }),
        jsonSchema: objectJsonSchema({
          scope: enumJsonSchema(
            ['month', 'season', 'year'],
            'Time scope for the summary. Defaults to month.',
          ),
          cropSeasonId: stringJsonSchema(
            'Crop season id for season-scoped summary.',
          ),
        }),
        execute: async ({ scope, cropSeasonId }, context) => {
          const resolvedScope = scope ?? 'month';
          const resolvedSeasonId =
            resolvedScope === 'season'
              ? (cropSeasonId ?? context.session.focusCropSeasonId ?? null)
              : undefined;

          if (resolvedScope === 'season' && !resolvedSeasonId) {
            return unavailable(
              'season_not_selected',
              'I need a crop season to show season expenses. Please select a farm first.',
            );
          }

          const summary = await this.expensesService.getSummary(
            context.session.userId,
            {
              scope: resolvedScope,
              cropSeasonId: resolvedSeasonId ?? undefined,
            },
          );

          return success(summary);
        },
      },
      {
        name: 'getCropTimeline',
        description:
          'Get the crop growth timeline showing current stage, all growth stages, and associated tasks for the active crop season.',
        schema: z.object({
          cropSeasonId: z.string().optional(),
        }),
        jsonSchema: objectJsonSchema({
          cropSeasonId: stringJsonSchema(
            'Crop season id to view timeline for. Uses the active season if omitted.',
          ),
        }),
        execute: async ({ cropSeasonId }, context) => {
          const seasonId =
            cropSeasonId ?? context.session.focusCropSeasonId ?? null;
          if (!seasonId) {
            return unavailable(
              'season_not_selected',
              'I need an active crop season to show the growth timeline.',
            );
          }

          const timeline = await this.cropSeasonsService.getTimeline(
            context.session.userId,
            seasonId,
          );

          return success(timeline, {
            focusCropSeasonId: seasonId,
            activeCropName:
              timeline.cropSeason.cropName ??
              context.session.activeCropName ??
              null,
          });
        },
      },
    ];
  }

  private async executePumpCommand(
    toolName: 'turnPumpOn' | 'turnPumpOff' | 'setPumpAuto',
    targetMode: 'FORCE_ON' | 'FORCE_OFF' | 'AUTO',
    args: { farmPlotId?: string; reason?: string },
    context: AssistantToolExecutionContext,
  ) {
    const plotId = await this.resolveFarmPlotId(context, args.farmPlotId);
    if (!plotId) {
      return unavailable(
        'farm_not_selected',
        'I need a saved farm plot before I can control irrigation.',
      );
    }

    const response = await this.devicesService.issuePumpCommand(
      context.session.userId,
      plotId,
      {
        targetMode,
        reason: args.reason,
      },
    );

    return success(response, {
      focusFarmPlotId: plotId,
      activeFieldLabel:
        response.deviceOverview?.name ??
        context.session.activeFieldLabel ??
        null,
    });
  }

  private async resolveFarmPlotId(
    context: AssistantToolExecutionContext,
    requestedFarmPlotId?: string,
  ) {
    if (requestedFarmPlotId) {
      return requestedFarmPlotId;
    }

    if (context.session.focusFarmPlotId) {
      return context.session.focusFarmPlotId;
    }

    if (context.session.focusCropSeasonId) {
      const season = await this.prisma.cropSeason.findFirst({
        where: {
          id: context.session.focusCropSeasonId,
          farmPlot: {
            userId: context.session.userId,
          },
        },
        select: {
          farmPlotId: true,
          cropName: true,
          farmPlot: {
            select: {
              name: true,
            },
          },
        },
      });

      if (season) {
        context.session.focusFarmPlotId = season.farmPlotId;
        context.session.activeCropName = season.cropName;
        context.session.activeFarmName = season.farmPlot.name;
        return season.farmPlotId;
      }
    }

    const profile = await this.usersService.getCurrentUser(
      context.session.userId,
    );
    const firstFarm = profile.farms[0] ?? null;
    if (!firstFarm) {
      return null;
    }

    context.session.focusFarmPlotId = firstFarm.id;
    context.session.activeFarmName = firstFarm.name;
    const firstSeason = firstFarm.cropSeasons[0] ?? null;
    if (firstSeason) {
      context.session.focusCropSeasonId = firstSeason.id;
      context.session.activeCropName = firstSeason.cropName;
    }

    return firstFarm.id;
  }

  private async resolveCropName(
    context: AssistantToolExecutionContext,
    requestedCropName?: string,
  ) {
    if (requestedCropName?.trim()) {
      return requestedCropName.trim();
    }

    if (context.session.activeCropName) {
      return context.session.activeCropName;
    }

    if (!context.session.focusCropSeasonId) {
      return null;
    }

    const season = await this.prisma.cropSeason.findFirst({
      where: {
        id: context.session.focusCropSeasonId,
        farmPlot: {
          userId: context.session.userId,
        },
      },
      select: {
        cropName: true,
      },
    });

    if (!season) {
      return null;
    }

    context.session.activeCropName = season.cropName;
    return season.cropName;
  }
}

function isDeviceControlTool(
  toolName: string,
): toolName is 'turnPumpOn' | 'turnPumpOff' {
  return toolName === 'turnPumpOn' || toolName === 'turnPumpOff';
}

function inferSeasonKey() {
  const month = new Date().getMonth() + 1;
  if (month >= 6 && month <= 10) {
    return 'KHARIF' as const;
  }

  if (month >= 11 || month <= 3) {
    return 'RABI' as const;
  }

  return 'ZAID' as const;
}

function inferWaterSupplyFromIrrigation(
  irrigationType?: string,
): 'PLENTY' | 'MODERATE' | 'LIMITED' | 'SCARCE' | undefined {
  if (!irrigationType) return undefined;
  const map: Record<string, 'PLENTY' | 'MODERATE' | 'LIMITED' | 'SCARCE'> = {
    DRIP: 'PLENTY',
    SPRINKLER: 'PLENTY',
    FLOOD: 'MODERATE',
    MANUAL: 'LIMITED',
    RAIN_FED: 'SCARCE',
  };
  return map[irrigationType];
}

function resolveImagePayload(
  input: string | undefined,
  historyMessages: AssistantHistoryMessage[] | undefined,
  strategy: 'latest' | 'first',
) {
  if (input && input !== 'LATEST') {
    return input;
  }

  const images = findAllImages(historyMessages ?? []);
  if (!images.length) {
    return null;
  }

  return strategy === 'latest' ? (images.at(-1) ?? null) : (images[0] ?? null);
}

function findAllImages(messages: AssistantHistoryMessage[]) {
  const images: string[] = [];

  for (const message of messages) {
    if (!Array.isArray(message.content)) {
      continue;
    }

    for (const part of message.content) {
      if (
        part &&
        typeof part === 'object' &&
        'type' in part &&
        (part as { type?: string }).type === 'image' &&
        'image' in part &&
        typeof (part as { image?: string }).image === 'string'
      ) {
        images.push((part as { image: string }).image);
      }
    }
  }

  return images;
}

function base64ToMulterFile(
  base64: string,
  fieldName: string,
  originalName: string,
): Express.Multer.File {
  const parts = base64.split(',');
  const data = parts.length > 1 ? parts[1] : parts[0];
  const buffer = Buffer.from(data, 'base64');

  return {
    fieldname: fieldName,
    originalname: originalName,
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer,
    size: buffer.length,
    stream: null as never,
    destination: '',
    filename: '',
    path: '',
  };
}

function success(
  data: unknown,
  contextUpdates?: AssistantToolResult['contextUpdates'],
): AssistantToolResult {
  return {
    ok: true,
    data,
    contextUpdates,
  };
}

function failure(code: string, message: string): AssistantToolResult {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  };
}

function unavailable(code: string, message: string): AssistantToolResult {
  return {
    ok: false,
    unavailable: {
      code,
      message,
    },
  };
}

function emptyObjectJsonSchema() {
  return {
    type: 'object',
    properties: {},
    additionalProperties: false,
  };
}

function objectJsonSchema(
  properties: Record<string, unknown>,
  required: string[] = [],
) {
  return {
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  };
}

function stringJsonSchema(description: string) {
  return {
    type: 'string',
    description,
  };
}

function numberJsonSchema(description: string) {
  return {
    type: 'number',
    description,
  };
}

function booleanJsonSchema(description: string) {
  return {
    type: 'boolean',
    description,
  };
}

function enumJsonSchema(values: string[], description: string) {
  return {
    type: 'string',
    enum: values,
    description,
  };
}
