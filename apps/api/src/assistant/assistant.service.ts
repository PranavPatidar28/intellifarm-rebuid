import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, generateText, stepCountIs, tool } from 'ai';
import { z } from 'zod';

import { PrismaService } from '../prisma/prisma.service';
import { RulesEngineService } from '../rules-engine/rules-engine.service';
import { PredictionsService } from '../predictions/predictions.service';
import { DiseaseReportsService } from '../disease-reports/disease-reports.service';
import { DISEASE_PROVIDER, type DiseaseProvider } from '../disease-reports/disease-provider';
import type { AssistantChatRequest } from './assistant.schemas';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly rulesEngine: RulesEngineService,
    private readonly predictionsService: PredictionsService,
    private readonly diseaseReportsService: DiseaseReportsService,
    @Inject(DISEASE_PROVIDER)
    private readonly diseaseProvider: DiseaseProvider,
  ) {}

  async chat(payload: AssistantChatRequest, userId: string): Promise<any> {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('AI_ASSISTANT_API_KEY');

    if (!apiKey) {
      throw new ServiceUnavailableException('Gemini API key is not configured');
    }

    const modelName =
      this.configService.get<string>('AI_ASSISTANT_MODEL') ||
      'gemini-1.5-flash';

    const google = createGoogleGenerativeAI({
      apiKey,
    });

    try {
      if (!payload.messages || !Array.isArray(payload.messages)) {
        throw new BadRequestException('Messages array is required');
      }

      // Vercel AI SDK frontend sends UIMessage with `parts`, but streamText expects ModelMessage with `content`.
      // We map it manually here.
      const mappedMessages = payload.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content ?? msg.parts ?? [],
      }));

      const result = await generateText({
        model: google(modelName),
        system: `You are IntelliFarm Assistant, a helpful AI for Indian farmers.
You have access to the user's farm data, weather, market prices, financial records, and agronomic rules through tools.
Always check the user's data before giving specific advice.

Multi-modal capabilities:
- You can see images sent by the user.
- If a user sends an image of a crop and asks about a disease, use your internal vision capabilities to describe what you see.
- IMPORTANT: For a formal, scientifically-backed diagnosis using our proprietary AI model, use the 'diagnoseDisease' tool.
- If the user has sent an image in the current conversation, you can trigger this tool. Use 'LATEST' for the image fields if you want to use the most recent image(s) provided by the user.

Crop Prediction:
- If a user asks what they should grow, use the 'predictCropSuitability' tool. This uses our own crop prediction model.

Agronomic Rules:
- When giving advice about irrigation, spraying, or crop stress, ALWAYS use the 'getWeatherAdvisories' tool. 

Financial Awareness:
- You can query the user's expenses and budgets. 

Reply in clean plain text. Use short paragraphs.
Use bullet points or numbered points only when they help clarity.
Do not return JSON, markdown tables, or code fences.
If you list steps, keep them brief and readable on mobile.
The current date is ${new Date().toLocaleDateString()}.`,
        messages: mappedMessages,
        tools: Object.fromEntries(Object.entries({
          getUserFarms: {
            description: 'Get a list of all farms belonging to the user',
            parameters: z.object({}),
            execute: async () => {
              return await this.prisma.farmPlot.findMany({
                where: { userId },
              });
            },
          },
          getActiveCropSeasons: {
            description: 'Get all active crop seasons for the user',
            parameters: z.object({}),
            execute: async () => {
              return await this.prisma.cropSeason.findMany({
                where: {
                  farmPlot: { userId },
                  status: 'ACTIVE',
                },
                include: {
                  farmPlot: true,
                },
              });
            },
          },
          getWeather: {
            description: 'Get the latest weather snapshot for a farm plot',
            parameters: z.object({
              farmPlotId: z.string().describe('The ID of the farm plot'),
            }),
            execute: async ({ farmPlotId }: { farmPlotId: string }) => {
              return await this.prisma.weatherSnapshot.findFirst({
                where: { farmPlotId },
                orderBy: { createdAt: 'desc' },
              });
            },
          },
          getMarketPrices: {
            description: 'Get the latest market prices for a crop in a state',
            parameters: z.object({
              cropName: z.string().describe('The name of the crop (e.g., Wheat, Paddy)'),
              state: z.string().describe('The state (e.g., Punjab, Haryana)'),
            }),
            execute: async ({ cropName, state }: { cropName: string; state: string }) => {
              return await this.prisma.marketRecord.findMany({
                where: {
                  cropName: { contains: cropName, mode: 'insensitive' },
                  state: { contains: state, mode: 'insensitive' },
                },
                orderBy: { recordDate: 'desc' },
                take: 5,
              });
            },
          },
          getTasks: {
            description: 'Get pending tasks for a specific crop season',
            parameters: z.object({
              cropSeasonId: z.string().describe('The ID of the crop season'),
            }),
            execute: async ({ cropSeasonId }: { cropSeasonId: string }) => {
              return await this.prisma.cropTask.findMany({
                where: {
                  cropSeasonId,
                  status: 'PENDING',
                },
                orderBy: { dueDate: 'asc' },
                take: 10,
              });
            },
          },
          getWeatherAdvisories: {
            description: 'Get scientifically-backed agronomic advisories based on weather and crop stage',
            parameters: z.object({
              cropSeasonId: z.string().describe('The ID of the active crop season'),
            }),
            execute: async ({ cropSeasonId }: { cropSeasonId: string }) => {
              const season = await this.prisma.cropSeason.findUnique({
                where: { id: cropSeasonId },
                include: { farmPlot: true },
              });
              if (!season || !season.farmPlot) return { advisories: ['Crop data not found'] };

              const weather = await this.prisma.weatherSnapshot.findFirst({
                where: { farmPlotId: season.farmPlotId },
                orderBy: { createdAt: 'desc' },
              });

              if (!weather) return { advisories: ['No weather data available for this farm'] };

              const weatherData = weather.rawPayload as any;
              const summary = {
                current: {
                  temperatureC: weatherData.current?.temp_c ?? 25,
                  rainfallExpectedMm: weatherData.current?.precip_mm ?? 0,
                  conditionLabel: weatherData.current?.condition?.text ?? 'Clear',
                },
              };

              const advisories = this.rulesEngine.buildWeatherAdvisories({
                weather: summary,
                cropName: season.cropName,
                currentStage: season.currentStage,
                irrigationType: season.farmPlot.irrigationType,
              });

              return { advisories };
            },
          },
          getExpenses: {
            description: 'Get expense entries for a user, optionally filtered by crop season',
            parameters: z.object({
              cropSeasonId: z.string().optional().describe('Filter expenses by crop season ID'),
            }),
            execute: async ({ cropSeasonId }: { cropSeasonId?: string }) => {
              return await this.prisma.expenseEntry.findMany({
                where: {
                  userId,
                  ...(cropSeasonId ? { cropSeasonId } : {}),
                },
                orderBy: { expenseDate: 'desc' },
                take: 20,
              });
            },
          },
          getBudgets: {
            description: 'Get expense budgets for the users active crop seasons',
            parameters: z.object({}),
            execute: async () => {
              return await this.prisma.expenseBudget.findMany({
                where: {
                  cropSeason: {
                    farmPlot: { userId },
                    status: 'ACTIVE',
                  },
                },
                include: {
                  cropSeason: true,
                },
              });
            },
          },
          getAlerts: {
            description: 'Get recent active alerts for the user',
            parameters: z.object({}),
            execute: async () => {
              return await this.prisma.alert.findMany({
                where: {
                  userId,
                  isRead: false,
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
              });
            },
          },
          predictCropSuitability: {
            description: 'Predict which crops are most suitable for a given farm or location using our proprietary model',
            parameters: z.object({
              farmPlotId: z.string().optional().describe('ID of an existing farm plot'),
              state: z.string().optional().describe('State if no farmPlotId'),
              irrigationType: z.enum(['RAIN_FED', 'DRIP', 'SPRINKLER', 'FLOOD', 'MANUAL']).optional(),
              season: z.enum(['KHARIF', 'RABI', 'ZAID', 'CUSTOM']).optional(),
            }),
            execute: async ({ farmPlotId, state, irrigationType, season }: { farmPlotId?: string; state?: string; irrigationType?: any; season?: any }) => {
              return await this.predictionsService.predictCropSuggestions(userId, {
                farmPlotId,
                explorerContext: state ? {
                  state,
                  irrigationType: irrigationType ?? 'MANUAL',
                } : undefined,
                seasonProfile: {
                  seasonKey: season ?? 'KHARIF',
                  sowingMonth: new Date().getMonth() + 1,
                },
              });
            },
          },
          diagnoseDisease: {
            description: 'Diagnose crop disease using our proprietary dual-angle AI model. Use LATEST if images were already sent.',
            parameters: z.object({
              cropName: z.string().describe('Name of the crop'),
              diseasedImageBase64: z.string().describe('Base64 data of the diseased crop photo. Pass LATEST to use the image recently sent by the user.'),
              healthyImageBase64: z.string().optional().describe('Base64 data of a healthy reference crop photo. Pass LATEST to use the reference image if provided.'),
              userNote: z.string().optional().describe('Users observation about the disease'),
            }),
            execute: async ({ cropName, diseasedImageBase64, healthyImageBase64, userNote }: { cropName: string; diseasedImageBase64: string; healthyImageBase64?: string; userNote?: string }) => {
              let diseasedB64 = diseasedImageBase64;
              let healthyB64 = healthyImageBase64;

              if (diseasedB64 === 'LATEST') {
                const latestImg = findLatestImage(payload.messages);
                if (!latestImg) return { error: 'No image found in conversation history.' };
                diseasedB64 = latestImg;
              }

              if (healthyB64 === 'LATEST') {
                const images = findAllImages(payload.messages);
                if (images.length >= 2) {
                  healthyB64 = images[0];
                  diseasedB64 = images[1];
                }
              }

              const diseasedFile = base64ToMulterFile(diseasedB64, 'diseasedImage', 'diseased.jpg');
              const cropFile = healthyB64 
                ? base64ToMulterFile(healthyB64, 'cropImage', 'healthy.jpg')
                : diseasedFile;

              const result = await this.diseaseProvider.analyzeDualAngleImages({
                cropName,
                userNote,
                captureMode: healthyB64 ? 'CAMERA_DUAL_ANGLE' : 'STANDARD',
                images: [diseasedFile, cropFile],
                diseasedImage: diseasedFile,
                cropImage: cropFile,
              });

              return result;
            },
          },
        }).map(([k, v]) => [k, tool(v as any)])),
        stopWhen: stepCountIs(5),
      } as any);

      return result;
    } catch (error) {
      this.logger.warn(
        `Gemini chat failed. ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadGatewayException('Gemini request failed');
    }
  }
}

function findLatestImage(messages: any[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const parts = Array.isArray(msg.content) ? msg.content : Array.isArray(msg.parts) ? msg.parts : [];
    
    for (let j = parts.length - 1; j >= 0; j--) {
      if (parts[j].type === 'image' && parts[j].image) {
        return parts[j].image;
      }
    }
  }
  return null;
}

function findAllImages(messages: any[]): string[] {
  const images: string[] = [];
  for (const msg of messages) {
    const parts = Array.isArray(msg.content) ? msg.content : Array.isArray(msg.parts) ? msg.parts : [];
    for (const part of parts) {
      if (part.type === 'image' && part.image) {
        images.push(part.image);
      }
    }
  }
  return images.reverse(); // Newest first
}

function base64ToMulterFile(base64: string, fieldName: string, originalName: string): Express.Multer.File {
  const parts = base64.split(',');
  const data = parts.length > 1 ? parts[1] : parts[0];
  const buffer = Buffer.from(data, 'base64');
  return {
    fieldname: fieldName,
    originalname: originalName,
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: buffer,
    size: buffer.length,
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };
}
