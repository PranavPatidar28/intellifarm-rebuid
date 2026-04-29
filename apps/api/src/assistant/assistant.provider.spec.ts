import { ConfigService } from '@nestjs/config';

import { GeminiAssistantProvider } from './assistant.provider';

describe('GeminiAssistantProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('formats Gemini native generateContent requests and parses structured replies', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      answer:
                        'From your IntelliFarm records: rainfall risk is elevated. General guidance: avoid spraying before the next rain band.',
                      spokenSummary:
                        'Rain risk is elevated, so avoid spraying before the next rain band.',
                      actionCards: [
                        {
                          title: 'Review weather',
                          body: 'Check today’s advisory before spraying.',
                          ctaLabel: 'Open home',
                          ctaRoute: '/home',
                          tone: 'weather',
                        },
                      ],
                      suggestedNextStep: {
                        label: 'Check the weather advisory first',
                        ctaLabel: 'Open home',
                        ctaRoute: '/home',
                      },
                      safetyFlags: ['CHEMICAL_GUARD'],
                      confidenceLabel: 'GENERAL',
                    }),
                  },
                ],
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const provider = new GeminiAssistantProvider(makeConfigService());

    await expect(
      provider.generateReply({
        message: 'Should I spray tomorrow?',
        language: 'en',
        originRoute: 'home',
        safetyFlags: ['CHEMICAL_GUARD'],
        contextSections: [
          {
            title: 'Weather advisories',
            body: 'Rain probability is high tomorrow afternoon.',
          },
        ],
        history: [
          {
            role: 'USER',
            content: 'How risky is the weather this week?',
            attachments: [],
          },
        ],
        currentAttachments: [
          {
            mimeType: 'image/jpeg',
            fileName: 'leaf.jpg',
            base64Data: Buffer.from('image-data').toString('base64'),
          },
        ],
      }),
    ).resolves.toMatchObject({
      confidenceLabel: 'GENERAL',
      safetyFlags: ['CHEMICAL_GUARD'],
      actionCards: [
        expect.objectContaining({
          ctaRoute: '/home',
        }),
      ],
    });

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent',
    );
    expect(init.method).toBe('POST');

    const body = JSON.parse(String(init.body));
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.system_instruction.parts[0].text).toContain(
      'Use IntelliFarm account data as the primary source of truth',
    );
    expect(body.contents[0]).toMatchObject({
      role: 'user',
      parts: [
        {
          text: 'How risky is the weather this week?',
        },
      ],
    });
    expect(body.contents[1].parts[1].inlineData.mimeType).toBe('image/jpeg');
  });
});

function makeConfigService() {
  return {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'GEMINI_API_KEY') {
        return 'test-api-key';
      }

      if (key === 'GEMINI_API_BASE_URL') {
        return 'https://generativelanguage.googleapis.com/v1beta';
      }

      if (key === 'AI_ASSISTANT_MODEL') {
        return 'gemini-3-flash-preview';
      }

      return fallback;
    }),
  } as unknown as ConfigService;
}
