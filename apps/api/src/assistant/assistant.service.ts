import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PreferredLanguage } from '@intellifarm/contracts';

import { DiseaseReportsService } from '../disease-reports/disease-reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { RulesEngineService } from '../rules-engine/rules-engine.service';
import { StorageService } from '../storage/storage.service';
import { WeatherService } from '../weather/weather.service';
import {
  ASSISTANT_PROVIDER,
  type AssistantAttachment,
  type AssistantContextSection,
  type AssistantGenerationInput,
  type AssistantHistoryTurn,
  type AssistantProvider,
  type AssistantProviderReply,
  type AssistantSource,
} from './assistant.provider';

type AssistantMessagePayload = {
  content: string;
  focusCropSeasonId?: string;
  focusFarmPlotId?: string;
  originRoute?: string;
  language?: PreferredLanguage;
};

type AssistantStoredReplyMeta = {
  spokenSummary: string;
  actionCards: AssistantProviderReply['actionCards'];
  suggestedNextStep: AssistantProviderReply['suggestedNextStep'];
  confidenceLabel: AssistantProviderReply['confidenceLabel'];
};

type AssistantContextBundle = {
  language: PreferredLanguage;
  defaultPlaceLabel?: string;
  sections: AssistantContextSection[];
  sources: AssistantSource[];
};

@Injectable()
export class AssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly weatherService: WeatherService,
    private readonly rulesEngineService: RulesEngineService,
    private readonly storageService: StorageService,
    private readonly diseaseReportsService: DiseaseReportsService,
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
    payload: AssistantMessagePayload,
    files: Express.Multer.File[] = [],
  ) {
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

    const initialSafetyFlags = deriveSafetyFlags(payload.content);
    let contextBundle = await this.buildContextBundle(userId, payload);
    let userAttachments: AssistantAttachment[] = [];
    let providerAttachments: AssistantGenerationInput['currentAttachments'] = [];
    const cropHealthIntent = isCropHealthIntent(
      payload.content,
      payload.originRoute,
    );

    let localReply: AssistantProviderReply | null = null;

    if (files.length) {
      if (cropHealthIntent && files.length === 2) {
        const diseaseReport = await this.diseaseReportsService.createReport(
          userId,
          {
            cropSeasonId: payload.focusCropSeasonId,
            placeLabel: payload.focusCropSeasonId
              ? undefined
              : contextBundle.defaultPlaceLabel,
            userNote: payload.content,
            captureMode: 'CAMERA_DUAL_ANGLE',
          },
          {
            diseasedImage: [files[0]],
            cropImage: [files[1]],
          },
        );

        userAttachments = buildAttachmentsFromDiseaseReport(diseaseReport.report);
        contextBundle = appendDiseaseReportContext(
          contextBundle,
          diseaseReport.report,
        );
        initialSafetyFlags.push('ROUTED_DISEASE_ANALYSIS');
      } else {
        userAttachments = await Promise.all(
          files.map((file) => this.persistAssistantAttachment(file)),
        );

        if (cropHealthIntent && files.length === 1) {
          initialSafetyFlags.push('NEEDS_REFERENCE_IMAGE');
          localReply = buildSingleImageCropHealthReply(
            payload.language ?? contextBundle.language,
          );
        } else {
          providerAttachments = files.map((file) => ({
            mimeType: file.mimetype,
            fileName: file.originalname,
            base64Data: file.buffer.toString('base64'),
          }));
        }
      }
    }

    await this.prisma.assistantMessage.create({
      data: {
        threadId,
        role: 'USER',
        content: payload.content,
        attachments: userAttachments,
        sources: [],
        safetyFlags: initialSafetyFlags,
      },
    });

    const history: AssistantHistoryTurn[] = [
      ...thread.messages.map((message) => ({
        role: message.role,
        content: message.content,
        attachments: parseAssistantAttachments(message.attachments),
      })),
      {
        role: 'USER',
        content: payload.content,
        attachments: userAttachments,
      },
    ];

    let providerReply: AssistantProviderReply;
    if (localReply) {
      providerReply = localReply;
    } else {
      try {
        providerReply = await this.assistantProvider.generateReply({
          message: payload.content,
          language: payload.language ?? contextBundle.language,
          originRoute: payload.originRoute,
          contextSections: contextBundle.sections,
          history,
          currentAttachments: providerAttachments,
          safetyFlags: initialSafetyFlags,
        });
      } catch {
        providerReply = buildFallbackReply(
          payload.language ?? contextBundle.language,
          initialSafetyFlags,
          payload.originRoute,
        );
        initialSafetyFlags.push('LIVE_PROVIDER_UNAVAILABLE');
      }
    }

    const normalizedReply = finalizeAssistantReply(
      providerReply,
      contextBundle.sources,
      initialSafetyFlags,
    );

    const assistantMessage = await this.prisma.assistantMessage.create({
      data: {
        threadId,
        role: 'ASSISTANT',
        content: normalizedReply.answer,
        attachments: [],
        sources: normalizedReply.sources,
        safetyFlags: normalizedReply.safetyFlags,
        responseMeta: {
          spokenSummary: normalizedReply.spokenSummary,
          actionCards: normalizedReply.actionCards,
          suggestedNextStep: normalizedReply.suggestedNextStep,
          confidenceLabel: normalizedReply.confidenceLabel,
        } satisfies AssistantStoredReplyMeta,
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

  private async persistAssistantAttachment(file: Express.Multer.File) {
    const url = await this.storageService.saveFile(file, 'assistant-attachments');

    return {
      type: 'image' as const,
      url,
      mimeType: file.mimetype,
      fileName: file.originalname,
    };
  }

  private async buildContextBundle(
    userId: string,
    payload: AssistantMessagePayload,
  ): Promise<AssistantContextBundle> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const language = payload.language ?? user.preferredLanguage;
    const farmPlots = await this.prisma.farmPlot.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    const allSeasons = await this.prisma.cropSeason.findMany({
      where: {
        farmPlot: { userId },
        status: { in: ['ACTIVE', 'PLANNED'] },
      },
      include: {
        farmPlot: true,
        expenseBudget: true,
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
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });
    const prioritizedSeasons = prioritizeSeasons(
      allSeasons,
      payload.focusCropSeasonId,
      payload.focusFarmPlotId,
    );
    const primarySeason = prioritizedSeasons[0] ?? null;
    const schemes = await this.prisma.scheme.findMany({
      where: {
        active: true,
        OR: [
          { applicableState: 'ALL' },
          ...(user.state ? [{ applicableState: user.state }] : []),
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 4,
    });
    const diseaseReports = await this.prisma.diseaseReport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 4,
      include: {
        cropSeason: true,
      },
    });

    const cropNames = [
      ...new Set(prioritizedSeasons.map((season) => season.cropName)),
    ].slice(0, 3);
    const marketRecords =
      (await this.prisma.marketRecord.findMany({
        where: {
          ...(user.state
            ? {
                state: {
                  equals: user.state,
                  mode: 'insensitive',
                },
              }
            : {}),
          ...(cropNames.length ? { cropName: { in: cropNames } } : {}),
        },
        orderBy: [{ recordDate: 'desc' }, { priceModal: 'desc' }],
        take: 5,
      })) ??
      [];

    const weatherSections = await Promise.all(
      prioritizedSeasons.slice(0, 3).map(async (season) => {
        const refreshedSeason =
          await this.rulesEngineService.syncSeasonLifecycle(season.id);
        const effectiveSeason = refreshedSeason ?? season;
        const weather = await this.weatherService.getWeatherForFarmPlot(
          effectiveSeason.farmPlot,
        );
        return {
          cropName: effectiveSeason.cropName,
          plotName: effectiveSeason.farmPlot.name,
          body: `Current condition ${weather.current.conditionLabel}, rain ${weather.current.rainProbabilityPercent}% and advisory: ${weather.advisories[0]?.message ?? 'Review the latest field advisory.'} Spray window: ${weather.fieldWindows.sprayWindow.summary}.`,
        };
      }),
    );

    const expenseSnapshot = primarySeason
      ? await this.buildExpenseSnapshot(primarySeason.id)
      : null;

    const sections: AssistantContextSection[] = [
      {
        title: 'Farmer profile',
        body: `Name: ${user.name ?? 'Unknown farmer'}. Preferred language: ${language}. Location: ${user.village ?? 'Unknown village'}, ${user.district ?? 'Unknown district'}, ${user.state ?? 'Unknown state'}.`,
      },
      ...(payload.originRoute
        ? [
            {
              title: 'Current screen',
              body: `The farmer opened the assistant from the ${payload.originRoute} screen.`,
            },
          ]
        : []),
      ...(farmPlots.length
        ? [
            {
              title: 'Farm plots',
              body: farmPlots
                .slice(0, 4)
                .map(
                  (plot) =>
                    `${plot.name}: ${plot.area} acre(s), ${plot.irrigationType.toLowerCase().replace(/_/g, ' ')}, soil ${plot.soilType?.toLowerCase().replace(/_/g, ' ') ?? 'not sure'}, location ${plot.village}, ${plot.district}, ${plot.state}.`,
                )
                .join(' '),
            },
          ]
        : []),
      ...(primarySeason
        ? [
            {
              title: 'Focused crop season',
              body: `${primarySeason.cropName} in ${primarySeason.farmPlot.name}, stage ${primarySeason.currentStage}, status ${primarySeason.status}. Pending tasks: ${primarySeason.tasks.map((task) => `${task.title} (${task.status})`).join(', ') || 'none'}.`,
            },
          ]
        : []),
      ...(prioritizedSeasons.length > 1
        ? [
            {
              title: 'Other active seasons',
              body: prioritizedSeasons
                .slice(1, 4)
                .map(
                  (season) =>
                    `${season.cropName} at ${season.farmPlot.name}, stage ${season.currentStage}, pending tasks ${season.tasks.length}.`,
                )
                .join(' '),
            },
          ]
        : []),
      ...(weatherSections.length
        ? [
            {
              title: 'Weather advisories',
              body: weatherSections
                .map(
                  (section) =>
                    `${section.cropName} in ${section.plotName}: ${section.body}`,
                )
                .join(' '),
            },
          ]
        : []),
      ...(marketRecords.length
        ? [
            {
              title: 'Market signals',
              body: marketRecords
                .map(
                  (record) =>
                    `${record.cropName} at ${record.mandiName}, ${record.state}: modal price ${record.priceModal} on ${record.recordDate.toISOString().slice(0, 10)}.`,
                )
                .join(' '),
            },
          ]
        : []),
      ...(schemes.length
        ? [
            {
              title: 'Relevant schemes',
              body: schemes
                .map(
                  (scheme) =>
                    `${scheme.title} (${scheme.applicableState}): ${scheme.description}`,
                )
                .join(' '),
            },
          ]
        : []),
      ...(diseaseReports.length
        ? [
            {
              title: 'Disease history',
              body: diseaseReports
                .map(
                  (report) =>
                    `${report.cropSeason?.cropName ?? report.placeLabel ?? 'Unlinked report'}: ${report.predictedIssue ?? 'unclear issue'}; recommendation ${report.recommendation}`,
                )
                .join(' '),
            },
          ]
        : []),
      ...(expenseSnapshot
        ? [
            {
              title: 'Expense snapshot',
              body: `For ${expenseSnapshot.cropName}, total expenses ${expenseSnapshot.totalAmount}, pending expenses ${expenseSnapshot.pendingAmount}, entries ${expenseSnapshot.entryCount}${expenseSnapshot.budgetAmount != null ? `, budget ${expenseSnapshot.budgetAmount}` : ''}.`,
            },
          ]
        : []),
    ];

    const sources = dedupeSources([
      { type: 'user', label: 'Farmer profile', referenceId: user.id },
      ...farmPlots.map((plot) => ({
        type: 'farm-plot',
        label: plot.name,
        referenceId: plot.id,
      })),
      ...prioritizedSeasons.map((season) => ({
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
      ...(expenseSnapshot
        ? [
            {
              type: 'expense-summary',
              label: `${expenseSnapshot.cropName} expense snapshot`,
              referenceId: expenseSnapshot.cropSeasonId,
            },
          ]
        : []),
    ]);

    return {
      language,
      defaultPlaceLabel:
        primarySeason?.farmPlot.name ?? farmPlots[0]?.name ?? user.village ?? undefined,
      sections,
      sources,
    };
  }

  private async buildExpenseSnapshot(cropSeasonId: string) {
    const cropSeason = await this.prisma.cropSeason.findUnique({
      where: { id: cropSeasonId },
      include: {
        expenseBudget: true,
      },
    });

    if (!cropSeason) {
      return null;
    }

    const [totalAggregate, pendingAggregate] = await Promise.all([
      this.prisma.expenseEntry.aggregate({
        where: { cropSeasonId },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.expenseEntry.aggregate({
        where: { cropSeasonId, status: 'PENDING' },
        _sum: { amount: true },
      }),
    ]);

    return {
      cropSeasonId,
      cropName: cropSeason.cropName,
      totalAmount: totalAggregate._sum.amount ?? 0,
      pendingAmount: pendingAggregate._sum.amount ?? 0,
      entryCount: totalAggregate._count.id ?? 0,
      budgetAmount: cropSeason.expenseBudget?.amount ?? null,
    };
  }
}

function prioritizeSeasons<
  T extends {
    id: string;
    farmPlotId: string;
    status: string;
  },
>(seasons: T[], focusCropSeasonId?: string, focusFarmPlotId?: string) {
  return [...seasons].sort((left, right) => {
    const leftScore =
      (left.id === focusCropSeasonId ? 10 : 0) +
      (left.farmPlotId === focusFarmPlotId ? 5 : 0) +
      (left.status === 'ACTIVE' ? 2 : 0);
    const rightScore =
      (right.id === focusCropSeasonId ? 10 : 0) +
      (right.farmPlotId === focusFarmPlotId ? 5 : 0) +
      (right.status === 'ACTIVE' ? 2 : 0);

    return rightScore - leftScore;
  });
}

function appendDiseaseReportContext(
  contextBundle: AssistantContextBundle,
  report: {
    id: string;
    cropSeasonId?: string | null;
    placeLabel?: string | null;
    predictedIssue?: string | null;
    recommendation: string;
    confidenceBand?: string | null;
    escalationRequired: boolean;
    cropSeason?: { cropName: string } | null;
  },
): AssistantContextBundle {
  return {
    ...contextBundle,
    sections: [
      ...contextBundle.sections,
      {
        title: 'Routed disease analysis',
        body: `${report.cropSeason?.cropName ?? report.placeLabel ?? 'Crop issue'} was routed through IntelliFarm disease analysis. Predicted issue: ${report.predictedIssue ?? 'unclear issue'}. Recommendation: ${report.recommendation}. Escalation required: ${report.escalationRequired ? 'yes' : 'no'}.`,
      },
    ],
    sources: dedupeSources([
      ...contextBundle.sources,
      {
        type: 'disease-report',
        label: report.predictedIssue ?? 'Routed disease report',
        referenceId: report.id,
      },
    ]),
  };
}

function buildAttachmentsFromDiseaseReport(report: {
  image1Url?: string | null;
  image2Url?: string | null;
}) {
  return [
    ...(report.image1Url
      ? [
          {
            type: 'image' as const,
            url: report.image1Url,
            mimeType: inferMimeTypeFromUrl(report.image1Url),
            fileName: extractFileName(report.image1Url),
          },
        ]
      : []),
    ...(report.image2Url
      ? [
          {
            type: 'image' as const,
            url: report.image2Url,
            mimeType: inferMimeTypeFromUrl(report.image2Url),
            fileName: extractFileName(report.image2Url),
          },
        ]
      : []),
  ];
}

function inferMimeTypeFromUrl(url: string) {
  const normalized = url.toLowerCase();
  if (normalized.endsWith('.png')) {
    return 'image/png';
  }
  if (normalized.endsWith('.webp')) {
    return 'image/webp';
  }
  return 'image/jpeg';
}

function extractFileName(url: string) {
  const withoutQuery = url.split('?')[0] ?? url;
  return withoutQuery.split('/').pop() ?? 'assistant-image.jpg';
}

function buildSingleImageCropHealthReply(language: PreferredLanguage) {
  const answer =
    language === 'hi'
      ? 'यह फसल-स्वास्थ्य सवाल लगता है, लेकिन सुरक्षित सलाह के लिए मुझे दो फोटो चाहिए: पहले प्रभावित हिस्से का क्लोज-अप और फिर पूरे पौधे या फसल का रेफरेंस फोटो।'
      : 'This looks like a crop-health question, but I need two photos for safer guidance: first a close-up of the affected part, then a full plant or field reference photo.';

  return {
    answer,
    spokenSummary: answer,
    actionCards: [
      {
        title: 'Open diagnose flow',
        body: 'Use the dual-photo crop check for a safer symptom review.',
        ctaLabel: 'Open diagnose',
        ctaRoute: '/diagnose',
        tone: 'diagnose' as const,
      },
      {
        title: 'Get expert help if severe',
        body: 'If the issue is spreading quickly, move to expert help.',
        ctaLabel: 'Expert help',
        ctaRoute: '/expert-help',
        tone: 'expert' as const,
      },
    ],
    suggestedNextStep: {
      label:
        language === 'hi'
          ? 'दो फोटो लेकर फिर से पूछें'
          : 'Attach both photos and ask again',
      ctaLabel: language === 'hi' ? 'डायग्नोज़ खोलें' : 'Open diagnose',
      ctaRoute: '/diagnose',
    },
    safetyFlags: ['NEEDS_REFERENCE_IMAGE', 'EXPERT_TRIAGE'],
    confidenceLabel: 'LOW' as const,
  };
}

function buildFallbackReply(
  language: PreferredLanguage,
  safetyFlags: string[],
  originRoute?: string,
) {
  const answer =
    language === 'hi'
      ? 'मैं अभी लाइव मॉडल तक नहीं पहुंच सका, इसलिए सुरक्षित बैकअप सलाह दे रहा हूँ। अपने लंबित काम, मौसम सलाह, हाल की बीमारी रिपोर्ट और बाजार जानकारी देखकर अगला कदम तय करें।'
      : 'I could not reach the live model just now, so I am giving a safe fallback answer. Review your pending tasks, weather advisories, recent disease notes, and market signals before taking the next action.';

  return {
    answer,
    spokenSummary: answer,
    actionCards: buildFallbackActionCards(originRoute),
    suggestedNextStep: buildFallbackSuggestedNextStep(originRoute),
    safetyFlags: [...safetyFlags, 'LIVE_PROVIDER_UNAVAILABLE'],
    confidenceLabel: 'GENERAL' as const,
  };
}

function buildFallbackActionCards(originRoute?: string) {
  if (originRoute === 'market') {
    return [
      {
        title: 'Review market explorer',
        body: 'Compare price, distance, and freshness before selling.',
        ctaLabel: 'Open market',
        ctaRoute: '/market',
        tone: 'market' as const,
      },
    ];
  }

  return [
    {
      title: 'Open weekly crop plan',
      body: 'Start with the most urgent field actions in your plan.',
      ctaLabel: 'Open crop plan',
      ctaRoute: '/crop-plan',
      tone: 'task' as const,
    },
    {
      title: 'Review current weather',
      body: 'Check the latest advisory before making field decisions.',
      ctaLabel: 'Open home',
      ctaRoute: '/home',
      tone: 'weather' as const,
    },
  ];
}

function buildFallbackSuggestedNextStep(originRoute?: string) {
  if (originRoute === 'market') {
    return {
      label: 'Compare the visible mandi options',
      ctaLabel: 'Open market',
      ctaRoute: '/market',
    };
  }

  return {
    label: 'Review the next farm action',
    ctaLabel: 'Open crop plan',
    ctaRoute: '/crop-plan',
  };
}

function finalizeAssistantReply(
  reply: AssistantProviderReply,
  sources: AssistantSource[],
  initialSafetyFlags: string[],
) {
  const mergedSafetyFlags = [
    ...new Set([...initialSafetyFlags, ...reply.safetyFlags]),
  ];
  const normalizedActionCards = reply.actionCards.length
    ? reply.actionCards.slice(0, 3)
    : buildActionCards(reply.answer, mergedSafetyFlags, sources);

  return {
    answer: reply.answer.trim(),
    spokenSummary: reply.spokenSummary.trim() || summarizeForSpeech(reply.answer),
    sources,
    safetyFlags: mergedSafetyFlags,
    confidenceLabel: reply.confidenceLabel,
    actionCards: normalizedActionCards,
    suggestedNextStep:
      reply.suggestedNextStep ??
      deriveSuggestedNextStep(mergedSafetyFlags, reply.answer),
  };
}

function deriveSafetyFlags(content: string) {
  const flags: string[] = [];
  const normalized = content.toLowerCase();

  if (
    /(pesticide|chemical|dose|dosage|spray mix|which medicine|fertilizer amount)/.test(
      normalized,
    )
  ) {
    flags.push('CHEMICAL_GUARD');
  }

  if (/(guarantee|sure profit|double income|loan approval)/.test(normalized)) {
    flags.push('PROMISE_GUARD');
  }

  if (
    /(expert|doctor|serious|dying|severe|spreading|urgent|wilting badly)/.test(
      normalized,
    )
  ) {
    flags.push('EXPERT_TRIAGE');
  }

  return flags;
}

function isCropHealthIntent(content: string, originRoute?: string) {
  if (originRoute === 'diagnose' || originRoute === 'expert-help') {
    return true;
  }

  return /(disease|pest|leaf|leaves|yellow|spot|spots|rust|fung|wilt|blight|crop problem|plant problem|what is wrong with my crop|damaged leaf)/i.test(
    content,
  );
}

function presentAssistantMessage(message: {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  attachments?: unknown;
  sources: unknown;
  safetyFlags: unknown;
  responseMeta?: unknown;
  createdAt: Date;
}) {
  const attachments = parseAssistantAttachments(message.attachments);
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
  const responseMeta = parseAssistantResponseMeta(message.responseMeta);
  const safetyLevel = deriveSafetyLevel(safetyFlags, message.content);
  const actionCards =
    message.role === 'ASSISTANT'
      ? responseMeta?.actionCards?.length
        ? responseMeta.actionCards
        : buildActionCards(message.content, safetyFlags, sources)
      : [];

  return {
    id: message.id,
    role: message.role,
    content: message.content,
    answer: message.content,
    spokenSummary:
      responseMeta?.spokenSummary ?? summarizeForSpeech(message.content),
    attachments,
    sources,
    safetyLevel,
    safetyFlags,
    confidenceLabel: responseMeta?.confidenceLabel ?? null,
    actionCards,
    suggestedNextStep:
      message.role === 'ASSISTANT'
        ? responseMeta?.suggestedNextStep ??
          deriveSuggestedNextStep(safetyFlags, message.content)
        : null,
    createdAt: message.createdAt.toISOString(),
  };
}

function parseAssistantAttachments(value: unknown): AssistantAttachment[] {
  return Array.isArray(value)
    ? value.filter(
        (attachment): attachment is AssistantAttachment =>
          !!attachment &&
          typeof attachment === 'object' &&
          'type' in attachment &&
          'url' in attachment &&
          'mimeType' in attachment &&
          'fileName' in attachment,
      )
    : [];
}

function parseAssistantResponseMeta(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const meta = value as Partial<AssistantStoredReplyMeta>;
  return {
    spokenSummary:
      typeof meta.spokenSummary === 'string' ? meta.spokenSummary : undefined,
    actionCards: Array.isArray(meta.actionCards)
      ? meta.actionCards.filter(
          (card): card is AssistantStoredReplyMeta['actionCards'][number] =>
            !!card &&
            typeof card === 'object' &&
            'title' in card &&
            'ctaRoute' in card,
        )
      : [],
    suggestedNextStep:
      meta.suggestedNextStep &&
      typeof meta.suggestedNextStep === 'object' &&
      'label' in meta.suggestedNextStep &&
      'ctaRoute' in meta.suggestedNextStep
        ? meta.suggestedNextStep
        : null,
    confidenceLabel:
      typeof meta.confidenceLabel === 'string' ? meta.confidenceLabel : null,
  };
}

function deriveSafetyLevel(flags: string[], content: string) {
  if (
    flags.includes('CHEMICAL_GUARD') ||
    flags.includes('EXPERT_TRIAGE') ||
    flags.includes('ROUTED_DISEASE_ANALYSIS') ||
    /consult.*expert|local agronomist|kvk/i.test(content)
  ) {
    return 'ESCALATE' as const;
  }

  if (
    flags.includes('PROMISE_GUARD') ||
    flags.includes('LIVE_PROVIDER_UNAVAILABLE') ||
    flags.includes('NEEDS_REFERENCE_IMAGE')
  ) {
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

  if (flags.includes('CHEMICAL_GUARD') || flags.includes('NEEDS_REFERENCE_IMAGE')) {
    cards.push({
      title: 'Diagnose before spray',
      body: 'Use the crop-diagnose flow to compare symptoms before treatment.',
      ctaLabel: 'Open diagnose',
      ctaRoute: '/diagnose',
      tone: 'diagnose',
    });
  }

  if (/market|mandi|price|sell|store/i.test(content)) {
    cards.push({
      title: 'Compare mandi prices',
      body: 'Check price, distance, and freshness together before planning transport.',
      ctaLabel: 'Open market',
      ctaRoute: '/market',
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
      body: 'Open weather-linked updates before making the next field decision.',
      ctaLabel: 'Open home',
      ctaRoute: '/home',
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
      ctaRoute: '/crop-plan',
      tone: 'task',
    });
  }

  return cards.slice(0, 3);
}

function deriveSuggestedNextStep(flags: string[], content: string) {
  if (flags.includes('CHEMICAL_GUARD') || flags.includes('NEEDS_REFERENCE_IMAGE')) {
    return {
      label: 'Get clearer symptom evidence first',
      ctaLabel: 'Diagnose crop problem',
      ctaRoute: '/diagnose',
    };
  }

  if (/market|sell|price/i.test(content)) {
    return {
      label: 'Compare price and distance together',
      ctaLabel: 'Check mandi prices',
      ctaRoute: '/market',
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
    ctaLabel: 'Open crop plan',
    ctaRoute: '/crop-plan',
  };
}

function summarizeForSpeech(content: string) {
  const cleaned = content.replace(/\s+/g, ' ').trim();
  return cleaned.length > 220 ? `${cleaned.slice(0, 217).trim()}...` : cleaned;
}

function dedupeSources(sources: AssistantSource[]) {
  const seen = new Set<string>();

  return sources.filter((source) => {
    const key = `${source.type}:${source.referenceId ?? source.label}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
