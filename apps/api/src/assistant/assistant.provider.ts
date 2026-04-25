import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type AssistantSource = {
  type: string;
  label: string;
  referenceId?: string;
};

export type AssistantReply = {
  content: string;
  sources: AssistantSource[];
  safetyFlags: string[];
};

export type AssistantGenerationInput = {
  message: string;
  contextText: string;
  sources: AssistantSource[];
  safetyFlags: string[];
};

export interface AssistantProvider {
  readonly providerName: string;
  generateReply(input: AssistantGenerationInput): Promise<AssistantReply>;
}

export const ASSISTANT_PROVIDER = Symbol('ASSISTANT_PROVIDER');

@Injectable()
export class MockAssistantProvider implements AssistantProvider {
  readonly providerName = 'mock-assistant-provider';

  generateReply(input: AssistantGenerationInput) {
    const replyParts = [
      'This answer is grounded in your current farm records, tasks, weather, markets, schemes, and disease history.',
    ];

    if (input.safetyFlags.includes('CHEMICAL_GUARD')) {
      replyParts.push(
        'I cannot give a blind chemical prescription. Start with field scouting, compare symptoms across plants, and confirm with a local agronomist or KVK before treatment.',
      );
    } else if (/market|mandi|price/i.test(input.message)) {
      replyParts.push(
        'Compare the nearest mandis first, then check the best current price in the results before deciding where to sell.',
      );
    } else if (/water|irrigation|dry/i.test(input.message)) {
      replyParts.push(
        'Use the latest weather and your current crop stage together before deciding the next irrigation turn.',
      );
    } else {
      replyParts.push(
        'Open the most urgent pending tasks first, then review the latest weather-linked advisory before taking action in the field.',
      );
    }

    if (input.contextText) {
      replyParts.push(
        'The answer stayed within the data already saved in your account.',
      );
    }

    return Promise.resolve({
      content: replyParts.join(' '),
      sources: input.sources,
      safetyFlags: input.safetyFlags,
    });
  }
}

@Injectable()
export class OpenAiCompatibleAssistantProvider implements AssistantProvider {
  readonly providerName = 'openai-compatible-assistant-provider';

  constructor(private readonly configService: ConfigService) {}

  async generateReply(input: AssistantGenerationInput) {
    const baseUrl = this.configService.get<string>('AI_ASSISTANT_BASE_URL');
    const apiKey = this.configService.get<string>('AI_ASSISTANT_API_KEY');
    const model = this.configService.get<string>(
      'AI_ASSISTANT_MODEL',
      'gpt-4.1-mini',
    );

    if (!baseUrl || !apiKey) {
      throw new Error('Assistant provider is not configured');
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are an India-first farming copilot. Use only the provided context. If the request needs a precise chemical prescription, unsupported financial promise, or anything not grounded in the context, clearly say you are not confident and recommend consulting a local expert or official source.',
          },
          {
            role: 'user',
            content: `Farmer question:\n${input.message}\n\nGrounded context:\n${input.contextText}`,
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`Assistant provider failed with ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('Assistant provider returned an empty response');
    }

    return {
      content,
      sources: input.sources,
      safetyFlags: input.safetyFlags,
    };
  }
}
