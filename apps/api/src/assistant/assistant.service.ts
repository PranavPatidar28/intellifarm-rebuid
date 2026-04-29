import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RulesEngineService } from '../rules-engine/rules-engine.service';
import { WeatherService } from '../weather/weather.service';
import {
  ASSISTANT_PROVIDER,
  type AssistantProvider,
  type AssistantReply,
  type AssistantSource,
} from './assistant.provider';

@Injectable()
export class AssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly weatherService: WeatherService,
    private readonly rulesEngineService: RulesEngineService,
    @Inject(ASSISTANT_PROVIDER)
    private readonly assistantProvider: AssistantProvider,
  ) {}

  async listThreads(userId: string) {
    const threads = await this.prisma.assistantThread.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      threads: threads.map((thread) => ({
        id: thread.id,
        title: thread.title ?? 'New conversation',
        updatedAt: thread.updatedAt.toISOString(),
        messageCount: thread._count.messages,
      })),
    };
  }

  async createThread(userId: string, payload: { title?: string }) {
    const thread = await this.prisma.assistantThread.create({
      data: {
        userId,
        title: payload.title,
      },
    });

    return {
      thread: {
        id: thread.id,
        title: thread.title,
        updatedAt: thread.updatedAt.toISOString(),
        messages: [],
      },
    };
  }

  async getThread(userId: string, threadId: string) {
    const thread = await this.prisma.assistantThread.findFirst({
      where: { id: threadId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!thread) {
      throw new NotFoundException('Assistant thread not found');
    }

    return {
      thread: {
        id: thread.id,
        title: thread.title,
        updatedAt: thread.updatedAt.toISOString(),
        messages: thread.messages.map((message) =>
          presentAssistantMessage(message),
        ),
      },
    };
  }

  async createMessage(
    userId: string,
    threadId: string,
    payload: { content: string },
  ) {
    const thread = await this.prisma.assistantThread.findFirst({
      where: { id: threadId, userId },
    });

    if (!thread) {
      throw new NotFoundException('Assistant thread not found');
    }

    const contextBundle = await this.buildContextBundle(userId);
    const safetyFlags = deriveSafetyFlags(payload.content);

    await this.prisma.assistantMessage.create({
      data: {
        threadId,
        role: 'USER',
        content: payload.content,
        sources: [],
        safetyFlags,
      },
    });

    let reply: AssistantReply;
    try {
      reply = await this.assistantProvider.generateReply({
        message: payload.content,
        contextText: contextBundle.contextText,
        sources: contextBundle.sources,
        safetyFlags,
      });
    } catch {
      reply = {
        content:
          'I could not reach the live assistant provider, so I am falling back to a safe grounded response. Review your latest tasks, weather actions, schemes, and crop health notes before taking action.',
        sources: contextBundle.sources,
        safetyFlags: [...safetyFlags, 'LIVE_PROVIDER_UNAVAILABLE'],
      };
    }

    const assistantMessage = await this.prisma.assistantMessage.create({
      data: {
        threadId,
        role: 'ASSISTANT',
        content: reply.content,
        sources: reply.sources,
        safetyFlags: reply.safetyFlags,
      },
    });

    if (!thread.title) {
      await this.prisma.assistantThread.update({
        where: { id: threadId },
        data: {
          title: payload.content.slice(0, 80),
        },
      });
    } else {
      await this.prisma.assistantThread.update({
        where: { id: threadId },
        data: {
          updatedAt: new Date(),
        },
      });
    }

    return {
      message: presentAssistantMessage(assistantMessage),
    };
  }

  private async buildContextBundle(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const seasons = await this.prisma.cropSeason.findMany({
      where: {
        farmPlot: { userId },
      },
      include: {
        farmPlot: true,
        tasks: {
          where: {
            status: {
              in: ['PENDING', 'OVERDUE'],
            },
          },
          orderBy: [{ dueDate: 'asc' }],
          take: 4,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
    const schemes = await this.prisma.scheme.findMany({
      where: {
        active: true,
        OR: [
          { applicableState: 'ALL' },
          ...(user.state ? [{ applicableState: user.state }] : []),
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 3,
    });
    const diseaseReports = await this.prisma.diseaseReport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        cropSeason: true,
      },
    });

    const marketRecords = await this.prisma.marketRecord.findMany({
      where: user.state
        ? {
            state: {
              equals: user.state,
              mode: 'insensitive',
            },
          }
        : undefined,
      orderBy: [{ recordDate: 'desc' }, { priceModal: 'desc' }],
      take: 3,
    });

    const weatherLines = await Promise.all(
      seasons.map(async (season) => {
        const refreshedSeason =
          await this.rulesEngineService.syncSeasonLifecycle(season.id);
        const effectiveSeason = refreshedSeason ?? season;
        const weather = await this.weatherService.getWeatherForFarmPlot(
          effectiveSeason.farmPlot,
        );
        return `Weather for ${effectiveSeason.cropName} in ${effectiveSeason.farmPlot.name}: ${weather.current.conditionLabel}. ${weather.advisories[0]?.message ?? 'Review the latest field advisory.'}`;
      }),
    );

    const sources: AssistantSource[] = [
      { type: 'user', label: 'Farmer profile', referenceId: user.id },
      ...seasons.map((season) => ({
        type: 'crop-season',
        label: `${season.cropName} in ${season.farmPlot.name}`,
        referenceId: season.id,
      })),
      ...schemes.map((scheme) => ({
        type: 'scheme',
        label: scheme.title,
        referenceId: scheme.id,
      })),
      ...diseaseReports.map((report) => ({
        type: 'disease-report',
        label: report.predictedIssue ?? 'Disease report',
        referenceId: report.id,
      })),
      ...marketRecords.map((record) => ({
        type: 'market',
        label: `${record.cropName} at ${record.mandiName}`,
        referenceId: record.id,
      })),
    ];

    const contextText = [
      `Farmer: ${user.name ?? 'Unknown'} in ${user.village ?? 'Unknown village'}, ${user.district ?? 'Unknown district'}, ${user.state ?? 'Unknown state'}`,
      ...seasons.map(
        (season) =>
          `Season ${season.cropName} at ${season.farmPlot.name}, stage ${season.currentStage}, pending tasks: ${
            season.tasks
              .map((task) => `${task.title} (${task.status})`)
              .join(', ') || 'none'
          }`,
      ),
      ...weatherLines,
      ...marketRecords.map(
        (record) =>
          `Market ${record.mandiName}, ${record.state}, ${record.cropName} modal price ${record.priceModal}`,
      ),
      ...schemes.map(
        (scheme) =>
          `Scheme ${scheme.title} for ${scheme.applicableState}: ${scheme.description}`,
      ),
      ...diseaseReports.map(
        (report) =>
          `Disease report for ${report.cropSeason?.cropName ?? report.placeLabel ?? 'new place'}: ${report.predictedIssue ?? 'unclear issue'} with recommendation ${report.recommendation}`,
      ),
    ].join('\n');

    return {
      contextText,
      sources,
    };
  }
}

function deriveSafetyFlags(content: string) {
  const flags: string[] = [];
  const normalized = content.toLowerCase();

  if (
    /(pesticide|chemical|dose|dosage|spray mix|which medicine)/.test(normalized)
  ) {
    flags.push('CHEMICAL_GUARD');
  }

  if (/(guarantee|sure profit|double income|loan approval)/.test(normalized)) {
    flags.push('PROMISE_GUARD');
  }

  if (/(expert|doctor|serious|dying|severe)/.test(normalized)) {
    flags.push('EXPERT_TRIAGE');
  }

  return flags;
}

function presentAssistantMessage(message: {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sources: unknown;
  safetyFlags: unknown;
  createdAt: Date;
}) {
  const sources = Array.isArray(message.sources)
    ? message.sources.filter(
        (source): source is AssistantSource =>
          !!source &&
          typeof source === 'object' &&
          'type' in source &&
          'label' in source,
      )
    : [];
  const safetyFlags = Array.isArray(message.safetyFlags)
    ? message.safetyFlags.filter(
        (flag): flag is string => typeof flag === 'string',
      )
    : [];
  const safetyLevel = deriveSafetyLevel(safetyFlags, message.content);
  const actionCards =
    message.role === 'ASSISTANT'
      ? buildActionCards(message.content, safetyFlags, sources)
      : [];

  return {
    id: message.id,
    role: message.role,
    content: message.content,
    answer: message.content,
    spokenSummary: summarizeForSpeech(message.content),
    sources,
    safetyLevel,
    safetyFlags,
    actionCards,
    suggestedNextStep:
      message.role === 'ASSISTANT'
        ? deriveSuggestedNextStep(safetyFlags, message.content)
        : null,
    createdAt: message.createdAt.toISOString(),
  };
}

function deriveSafetyLevel(flags: string[], content: string) {
  if (
    flags.includes('CHEMICAL_GUARD') ||
    flags.includes('EXPERT_TRIAGE') ||
    /consult.*expert|local agronomist|kvk/i.test(content)
  ) {
    return 'ESCALATE' as const;
  }

  if (flags.includes('PROMISE_GUARD') || flags.includes('LIVE_PROVIDER_UNAVAILABLE')) {
    return 'CAUTION' as const;
  }

  return 'INFO' as const;
}

function buildActionCards(
  content: string,
  flags: string[],
  sources: AssistantSource[],
) {
  const cards: Array<{
    title: string;
    body: string;
    ctaLabel: string;
    ctaRoute: string;
    tone: 'weather' | 'diagnose' | 'market' | 'scheme' | 'expert' | 'task';
  }> = [];

  if (flags.includes('CHEMICAL_GUARD')) {
    cards.push({
      title: 'Diagnose before spray',
      body: 'Upload crop photos first so you can compare symptoms safely before any chemical step.',
      ctaLabel: 'Open diagnose',
      ctaRoute: '/(tabs)/diagnose',
      tone: 'diagnose',
    });
  }

  if (/market|mandi|price|sell|store/i.test(content)) {
    cards.push({
      title: 'Compare mandi prices',
      body: 'Check price, distance, and freshness together before planning transport.',
      ctaLabel: 'Open market',
      ctaRoute: '/(tabs)/market',
      tone: 'market',
    });
  }

  if (/scheme|insurance|credit|pmfby|kisan/i.test(content)) {
    cards.push({
      title: 'Review schemes',
      body: 'Open relevant schemes and keep documents ready if you plan to apply.',
      ctaLabel: 'Open schemes',
      ctaRoute: '/schemes',
      tone: 'scheme',
    });
  }

  if (
    /weather|rain|irrigation|dry|heat/i.test(content) ||
    sources.some((source) => source.type === 'crop-season')
  ) {
    cards.push({
      title: 'Check field weather',
      body: 'Open the weather detail to review rain timing, advisories, and field windows.',
      ctaLabel: 'Open weather',
      ctaRoute: '/(tabs)/home',
      tone: 'weather',
    });
  }

  if (flags.includes('EXPERT_TRIAGE') || /expert|serious|unclear/i.test(content)) {
    cards.push({
      title: 'Escalate for expert help',
      body: 'Use expert help when the issue is spreading, severe, or still unclear.',
      ctaLabel: 'Get expert help',
      ctaRoute: '/expert-help',
      tone: 'expert',
    });
  }

  if (!cards.length) {
    cards.push({
      title: 'Open weekly tasks',
      body: 'Start with the most urgent field actions for this week.',
      ctaLabel: 'Open crop plan',
      ctaRoute: '/(tabs)/crop-plan',
      tone: 'task',
    });
  }

  return cards.slice(0, 3);
}

function deriveSuggestedNextStep(flags: string[], content: string) {
  if (flags.includes('CHEMICAL_GUARD')) {
    return {
      label: 'Get clearer symptom evidence first',
      ctaLabel: 'Diagnose crop problem',
      ctaRoute: '/(tabs)/diagnose',
    };
  }

  if (/market|sell|price/i.test(content)) {
    return {
      label: 'Compare price and distance together',
      ctaLabel: 'Check mandi prices',
      ctaRoute: '/(tabs)/market',
    };
  }

  if (/scheme|insurance|credit/i.test(content)) {
    return {
      label: 'Open relevant support schemes',
      ctaLabel: 'View schemes',
      ctaRoute: '/schemes',
    };
  }

  return {
    label: 'Review this week’s field actions',
    ctaLabel: 'Open home feed',
    ctaRoute: '/(tabs)/home',
  };
}

function summarizeForSpeech(content: string) {
  const cleaned = content.replace(/\s+/g, ' ').trim();
  return cleaned.length > 220 ? `${cleaned.slice(0, 217).trim()}...` : cleaned;
}
