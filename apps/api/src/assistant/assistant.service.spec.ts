import { AssistantService } from './assistant.service';

describe('AssistantService', () => {
  it('sends full thread history to the provider before creating the assistant reply', async () => {
    const providerGenerateReply = jest.fn().mockResolvedValue({
      answer:
        'From your IntelliFarm records: your latest season is active. General guidance: check the next weather advisory before irrigating.',
      spokenSummary:
        'Your latest season is active, so check the next weather advisory before irrigating.',
      actionCards: [],
      suggestedNextStep: null,
      safetyFlags: [],
      confidenceLabel: 'GENERAL' as const,
    });
    const harness = makeHarness({
      threadMessages: [
        makeStoredMessage({
          id: 'old-user',
          role: 'USER',
          content: 'How is my soybean field doing?',
        }),
        makeStoredMessage({
          id: 'old-assistant',
          role: 'ASSISTANT',
          content: 'From your IntelliFarm records: soybean is active.',
          sources: [{ type: 'crop-season', label: 'Soybean in North plot' }],
          responseMeta: {
            spokenSummary: 'Soybean is active.',
            actionCards: [],
            suggestedNextStep: null,
            confidenceLabel: 'GENERAL',
          },
        }),
      ],
      providerGenerateReply,
    });

    await harness.service.createMessage('user-1', 'thread-1', {
      content: 'What should I do next?',
    });

    expect(providerGenerateReply).toHaveBeenCalledWith(
      expect.objectContaining({
        history: [
          expect.objectContaining({
            role: 'USER',
            content: 'How is my soybean field doing?',
          }),
          expect.objectContaining({
            role: 'ASSISTANT',
            content: 'From your IntelliFarm records: soybean is active.',
          }),
          expect.objectContaining({
            role: 'USER',
            content: 'What should I do next?',
          }),
        ],
      }),
    );
  });

  it('blocks one-image crop-health questions and asks for a reference image', async () => {
    const providerGenerateReply = jest.fn();
    const harness = makeHarness({
      providerGenerateReply,
      storageSaveFile: jest
        .fn()
        .mockResolvedValue('http://localhost:4000/v1/media/assistant-attachments/leaf.jpg'),
    });

    const result = await harness.service.createMessage(
      'user-1',
      'thread-1',
      {
        content: 'What disease is this on my leaf?',
        originRoute: 'diagnose',
      },
      [makeFile('leaf.jpg')],
    );

    expect(providerGenerateReply).not.toHaveBeenCalled();
    expect(result.message.safetyFlags).toEqual(
      expect.arrayContaining(['NEEDS_REFERENCE_IMAGE']),
    );
    expect(result.message.actionCards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ctaRoute: '/diagnose',
        }),
      ]),
    );
    expect(harness.assistantMessageCreate.mock.calls[0]?.[0].data.attachments).toEqual([
      expect.objectContaining({
        url: 'http://localhost:4000/v1/media/assistant-attachments/leaf.jpg',
      }),
    ]);
  });

  it('routes two crop-health images through disease reports and adds the disease report as a source', async () => {
    const providerGenerateReply = jest.fn().mockResolvedValue({
      answer:
        'From your IntelliFarm records: the routed disease analysis points to leaf rust. General guidance: confirm locally before treatment.',
      spokenSummary:
        'The routed disease analysis points to leaf rust, so confirm locally before treatment.',
      actionCards: [],
      suggestedNextStep: null,
      safetyFlags: ['EXPERT_TRIAGE'],
      confidenceLabel: 'ROUTED' as const,
    });
    const createReport = jest.fn().mockResolvedValue({
      report: {
        id: 'report-1',
        cropSeasonId: 'season-1',
        cropSeason: { cropName: 'Wheat' },
        placeLabel: null,
        predictedIssue: 'Leaf rust',
        recommendation: 'Confirm locally before treatment.',
        escalationRequired: true,
        image1Url: 'http://localhost:4000/v1/media/disease-reports/symptom.jpg',
        image2Url: 'http://localhost:4000/v1/media/disease-reports/full-crop.jpg',
      },
    });
    const harness = makeHarness({
      providerGenerateReply,
      createReport,
    });

    const result = await harness.service.createMessage(
      'user-1',
      'thread-1',
      {
        content: 'These wheat leaves have rust spots. What should I do?',
        focusCropSeasonId: 'season-1',
        originRoute: 'diagnose',
      },
      [makeFile('symptom.jpg'), makeFile('full-crop.jpg')],
    );

    expect(createReport).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        cropSeasonId: 'season-1',
        captureMode: 'CAMERA_DUAL_ANGLE',
      }),
      expect.objectContaining({
        diseasedImage: [expect.objectContaining({ originalname: 'symptom.jpg' })],
        cropImage: [expect.objectContaining({ originalname: 'full-crop.jpg' })],
      }),
    );
    expect(providerGenerateReply).toHaveBeenCalledWith(
      expect.objectContaining({
        currentAttachments: [],
        contextSections: expect.arrayContaining([
          expect.objectContaining({
            title: 'Routed disease analysis',
          }),
        ]),
      }),
    );
    expect(result.message.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'disease-report',
          referenceId: 'report-1',
        }),
      ]),
    );
  });
});

function makeHarness({
  threadMessages = [],
  providerGenerateReply = jest.fn(),
  createReport = jest.fn(),
  storageSaveFile = jest.fn(),
}: {
  threadMessages?: Array<ReturnType<typeof makeStoredMessage>>;
  providerGenerateReply?: jest.Mock;
  createReport?: jest.Mock;
  storageSaveFile?: jest.Mock;
}) {
  let createdMessageCount = 0;
  const assistantMessageCreate = jest
    .fn()
    .mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: `assistant-message-${++createdMessageCount}`,
      role: data.role as 'USER' | 'ASSISTANT',
      content: data.content as string,
      attachments: (data.attachments as unknown[]) ?? [],
      sources: (data.sources as unknown[]) ?? [],
      safetyFlags: (data.safetyFlags as unknown[]) ?? [],
      responseMeta: data.responseMeta,
      createdAt: new Date('2026-04-30T00:00:00.000Z'),
    }));
  const assistantThreadFindFirst = jest.fn().mockResolvedValue({
    id: 'thread-1',
    userId: 'user-1',
    title: null,
    messages: threadMessages,
  });
  const prisma = {
    assistantThread: {
      findFirst: assistantThreadFindFirst,
      update: jest.fn().mockResolvedValue(null),
    },
    assistantMessage: {
      create: assistantMessageCreate,
    },
    user: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: 'user-1',
        name: 'Farmer One',
        preferredLanguage: 'en',
        village: 'Khed',
        district: 'Pune',
        state: 'Maharashtra',
      }),
    },
    farmPlot: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    cropSeason: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    scheme: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    diseaseReport: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    marketRecord: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    expenseEntry: {
      aggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { amount: 0 }, _count: { id: 0 } }),
    },
  };
  const service = new AssistantService(
    prisma as never,
    {
      getWeatherForFarmPlot: jest.fn(),
    } as never,
    {
      syncSeasonLifecycle: jest.fn(),
    } as never,
    {
      saveFile: storageSaveFile,
    } as never,
    {
      createReport,
    } as never,
    {
      providerName: 'test-provider',
      generateReply: providerGenerateReply,
    } as never,
  );

  return {
    service,
    assistantMessageCreate,
  };
}

function makeStoredMessage({
  id,
  role,
  content,
  sources = [],
  attachments = [],
  safetyFlags = [],
  responseMeta = null,
}: {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sources?: unknown[];
  attachments?: unknown[];
  safetyFlags?: string[];
  responseMeta?: unknown;
}) {
  return {
    id,
    role,
    content,
    attachments,
    sources,
    safetyFlags,
    responseMeta,
    createdAt: new Date('2026-04-29T00:00:00.000Z'),
  };
}

function makeFile(originalname: string): Express.Multer.File {
  return {
    originalname,
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake-image'),
  } as Express.Multer.File;
}
