import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AssistantChatRequest } from './assistant.schemas';

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

type GeminiAttemptError = {
  endpoint: string;
  message: string;
  status?: number;
};

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(private readonly configService: ConfigService) {}

  async chat(payload: AssistantChatRequest) {
    const endpoint = this.configService.get<string>('GEMINI_CHAT_URL');

    if (!endpoint) {
      throw new ServiceUnavailableException('Gemini chat is not configured');
    }

    try {
      const endpoints = buildCandidateEndpoints(endpoint);
      const requestBody = {
        system_instruction: {
          parts: [
            {
              text: [
                'You are IntelliFarm Assistant.',
                'Reply in clean plain text.',
                'Use short paragraphs.',
                'Use bullet points or numbered points only when they help clarity.',
                'Do not return JSON, markdown tables, or code fences.',
                'If you list steps, keep them brief and readable on mobile.',
              ].join(' '),
            },
          ],
        },
        contents: [
          ...payload.history.map((item) => ({
            role: item.role,
            parts: [{ text: item.text }],
          })),
          {
            role: 'user',
            parts: [{ text: payload.message }],
          },
        ],
      };

      let lastError: GeminiAttemptError | null = null;

      for (const candidate of endpoints) {
        for (let attempt = 1; attempt <= 3; attempt += 1) {
          const result = await this.tryGeminiRequest(candidate, requestBody);

          if (result.ok) {
            return { reply: normalizeAssistantReply(result.reply) };
          }

          lastError = {
            endpoint: candidate,
            message: result.message,
            status: result.status,
          };

          if (!shouldRetry(result.status) || attempt === 3) {
            break;
          }

          await delay(attempt * 600);
        }
      }

      throw new BadGatewayException(
        lastError?.message ?? 'Gemini request failed',
      );
    } catch (error) {
      this.logger.warn(
        `Gemini chat failed, using fallback reply. ${describeError(error)}`,
      );

      return {
        reply: normalizeAssistantReply(buildFallbackReply(payload.message)),
      };
    }
  }

  private async tryGeminiRequest(
    endpoint: string,
    body: Record<string, unknown>,
  ) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data: GeminiGenerateContentResponse;

    try {
      data = JSON.parse(text) as GeminiGenerateContentResponse;
    } catch {
      return {
        ok: false as const,
        message: 'Gemini returned an unreadable response',
        status: response.status,
      };
    }

    if (!response.ok) {
      return {
        ok: false as const,
        message: data.error?.message ?? 'Gemini request failed',
        status: response.status,
      };
    }

    const reply = extractReplyText(data);

    if (!reply) {
      return {
        ok: false as const,
        message: 'Gemini returned an empty response',
        status: response.status,
      };
    }

    return {
      ok: true as const,
      reply,
    };
  }
}

function extractReplyText(payload: GeminiGenerateContentResponse) {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];

  return parts
    .map((part) => part.text?.trim() ?? '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

function buildCandidateEndpoints(primaryEndpoint: string) {
  const candidates = [primaryEndpoint];

  for (const model of ['gemini-flash-latest', 'gemini-2.5-flash-lite']) {
    const alternate = primaryEndpoint.replace(
      /\/models\/[^/:?]+:generateContent/i,
      `/models/${model}:generateContent`,
    );

    if (!candidates.includes(alternate)) {
      candidates.push(alternate);
    }
  }

  return candidates;
}

function buildFallbackReply(message: string) {
  const normalized = message.trim();

  if (!normalized) {
    return 'I am here. Ask me a farming question and I will reply.';
  }

  return `You asked: "${normalized}". The live AI service is unavailable right now, but the chat is working and I received your request.`;
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown Gemini error';
}

function shouldRetry(status?: number) {
  return status === 429 || status === 500 || status === 502 || status === 503;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeAssistantReply(reply: string) {
  return reply
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
