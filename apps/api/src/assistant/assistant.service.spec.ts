import { ConfigService } from '@nestjs/config';

import { AssistantService } from './assistant.service';

describe('AssistantService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
  });

  it('sends the chat history to Gemini and returns the first text reply', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: 'Hello from Gemini' }],
                },
              },
            ],
          }),
        ),
    });

    const service = new AssistantService(
      {
        get: jest.fn().mockReturnValue('https://example.com/gemini'),
      } as unknown as ConfigService,
    );

    const result = await service.chat({
      message: 'How is the market today?',
      history: [
        { role: 'user', text: 'Hello' },
        { role: 'model', text: 'Hi there' },
      ],
    });

    expect(result).toEqual({ reply: 'Hello from Gemini' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/gemini',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text: 'You are IntelliFarm Assistant. Reply in clean plain text. Use short paragraphs. Use bullet points or numbered points only when they help clarity. Do not return JSON, markdown tables, or code fences. If you list steps, keep them brief and readable on mobile.',
              },
            ],
          },
          contents: [
            { role: 'user', parts: [{ text: 'Hello' }] },
            { role: 'model', parts: [{ text: 'Hi there' }] },
            {
              role: 'user',
              parts: [{ text: 'How is the market today?' }],
            },
          ],
        }),
      }),
    );
  });

  it('returns a local fallback reply when Gemini fails', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    const service = new AssistantService(
      {
        get: jest.fn().mockReturnValue('https://example.com/gemini'),
      } as unknown as ConfigService,
    );

    await expect(
      service.chat({
        message: 'Can you help me?',
        history: [],
      }),
    ).resolves.toEqual({
      reply:
        'You asked: "Can you help me?". The live AI service is unavailable right now, but the chat is working and I received your request.',
    });
  });

  it('fails over to a secondary Gemini model when the primary model is unavailable', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              error: {
                message: 'This model is currently experiencing high demand.',
              },
            }),
          ),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              error: {
                message: 'This model is currently experiencing high demand.',
              },
            }),
          ),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              error: {
                message: 'This model is currently experiencing high demand.',
              },
            }),
          ),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [{ text: 'Recovered on fallback model' }],
                  },
                },
              ],
            }),
          ),
      });

    const service = new AssistantService(
      {
        get: jest
          .fn()
          .mockReturnValue(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=test-key',
          ),
      } as unknown as ConfigService,
    );

    await expect(
      service.chat({
        message: 'hello',
        history: [],
      }),
    ).resolves.toEqual({
      reply: 'Recovered on fallback model',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=test-key',
      expect.any(Object),
    );
  });
});
