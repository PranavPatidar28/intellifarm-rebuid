import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  assistantActionCardSchema,
  assistantConfidenceLabels,
  assistantSuggestedNextStepSchema,
  preferredLanguages,
} from '@intellifarm/contracts';
import { z } from 'zod';

export type AssistantSource = {
  type: string;
  label: string;
  referenceId?: string;
};

export type AssistantAttachment = {
  type: 'image';
  url: string;
  mimeType: string;
  fileName: string;
};

export type AssistantContextSection = {
  title: string;
  body: string;
};

export type AssistantHistoryTurn = {
  role: 'USER' | 'ASSISTANT';
  content: string;
  attachments: AssistantAttachment[];
};

export type AssistantGenerationInput = {
  message: string;
  language: (typeof preferredLanguages)[number];
  originRoute?: string;
  contextSections: AssistantContextSection[];
  history: AssistantHistoryTurn[];
  currentAttachments: Array<{
    mimeType: string;
    fileName: string;
    base64Data: string;
  }>;
  safetyFlags: string[];
};

export type AssistantProviderReply = {
  answer: string;
  spokenSummary: string;
  actionCards: Array<{
    title: string;
    body: string;
    ctaLabel: string;
    ctaRoute: string;
    tone: 'weather' | 'diagnose' | 'market' | 'scheme' | 'expert' | 'task';
  }>;
  suggestedNextStep: {
    label: string;
    ctaLabel: string;
    ctaRoute: string;
  } | null;
  safetyFlags: string[];
  confidenceLabel: (typeof assistantConfidenceLabels)[number] | null;
};

export interface AssistantProvider {
  readonly providerName: string;
  generateReply(input: AssistantGenerationInput): Promise<AssistantProviderReply>;
}

export const ASSISTANT_PROVIDER = Symbol('ASSISTANT_PROVIDER');

const assistantProviderReplySchema = z.object({
  answer: z.string().trim().min(1),
  spokenSummary: z.string().trim().min(1),
  actionCards: z.array(assistantActionCardSchema).max(3).default([]),
  suggestedNextStep: assistantSuggestedNextStepSchema.nullable().default(null),
  safetyFlags: z.array(z.string().trim().min(1)).max(8).default([]),
  confidenceLabel: z.enum(assistantConfidenceLabels).nullable().default(null),
});

const assistantProviderReplyJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'answer',
    'spokenSummary',
    'actionCards',
    'suggestedNextStep',
    'safetyFlags',
    'confidenceLabel',
  ],
  properties: {
    answer: { type: 'string' },
    spokenSummary: { type: 'string' },
    actionCards: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'body', 'ctaLabel', 'ctaRoute', 'tone'],
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
          ctaLabel: { type: 'string' },
          ctaRoute: { type: 'string' },
          tone: {
            type: 'string',
            enum: ['weather', 'diagnose', 'market', 'scheme', 'expert', 'task'],
          },
        },
      },
    },
    suggestedNextStep: {
      oneOf: [
        { type: 'null' },
        {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'ctaLabel', 'ctaRoute'],
          properties: {
            label: { type: 'string' },
            ctaLabel: { type: 'string' },
            ctaRoute: { type: 'string' },
          },
        },
      ],
    },
    safetyFlags: {
      type: 'array',
      items: { type: 'string' },
    },
    confidenceLabel: {
      oneOf: [
        { type: 'null' },
        {
          type: 'string',
          enum: assistantConfidenceLabels,
        },
      ],
    },
  },
} as const;

@Injectable()
export class MockAssistantProvider implements AssistantProvider {
  readonly providerName = 'mock-assistant-provider';

  generateReply(input: AssistantGenerationInput) {
    const responsePrefix =
      input.language === 'hi'
        ? 'आपके IntelliFarm रिकॉर्ड और सामान्य खेती मार्गदर्शन के आधार पर:'
        : 'Based on your IntelliFarm records and general farming guidance:';

    const answerParts = [responsePrefix];

    if (input.safetyFlags.includes('CHEMICAL_GUARD')) {
      answerParts.push(
        input.language === 'hi'
          ? 'बिना पक्की पुष्टि के सटीक रसायन या डोज़ बताना सुरक्षित नहीं है। पहले लक्षण मिलाइए और स्थानीय कृषि विशेषज्ञ या KVK से पुष्टि कीजिए।'
          : 'It is not safe to give an exact chemical or dosage without stronger evidence. Compare symptoms first and confirm with a local agronomist or KVK.',
      );
    } else if (/market|mandi|price|sell/i.test(input.message)) {
      answerParts.push(
        input.language === 'hi'
          ? 'सबसे पहले नजदीकी मंडियों की कीमत, दूरी और ताजगी साथ में देखिए।'
          : 'Compare the nearest mandis for price, distance, and freshness together before deciding where to sell.',
      );
    } else if (/disease|leaf|yellow|spot|wilt|pest/i.test(input.message)) {
      answerParts.push(
        input.language === 'hi'
          ? 'फील्ड में कई पौधों पर लक्षण मिलाइए और समस्या बढ़ रही हो तो एक्सपर्ट हेल्प लीजिए।'
          : 'Compare the symptoms across several plants and escalate for expert help if the issue is spreading.',
      );
    } else {
      answerParts.push(
        input.language === 'hi'
          ? 'सबसे जरूरी लंबित काम और मौसम सलाह पहले देखें, फिर अगला कदम तय करें।'
          : 'Review the most urgent pending tasks and the latest weather advisory before taking the next field step.',
      );
    }

    const answer = answerParts.join(' ');

    return Promise.resolve(
      normalizeProviderReply({
        answer,
        spokenSummary: answer,
        actionCards: [],
        suggestedNextStep: null,
        safetyFlags: input.safetyFlags,
        confidenceLabel:
          input.currentAttachments.length > 0 ? 'ROUTED' : 'GENERAL',
      }),
    );
  }
}

@Injectable()
export class GeminiAssistantProvider implements AssistantProvider {
  readonly providerName = 'gemini-assistant-provider';

  constructor(private readonly configService: ConfigService) {}

  async generateReply(input: AssistantGenerationInput) {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ??
      this.configService.get<string>('AI_ASSISTANT_API_KEY');
    const baseUrl =
      this.configService.get<string>('GEMINI_API_BASE_URL') ??
      'https://generativelanguage.googleapis.com/v1beta';
    const model = this.configService.get<string>(
      'AI_ASSISTANT_MODEL',
      'gemini-3-flash-preview',
    );

    if (!apiKey) {
      throw new Error('Gemini assistant provider is not configured');
    }

    const response = await fetch(
      `${baseUrl.replace(/\/$/, '')}/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: buildSystemInstruction(input.language) }],
          },
          contents: buildContents(input),
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseJsonSchema: assistantProviderReplyJsonSchema,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini assistant provider failed with ${response.status}`);
    }

    const payload = (await response.json()) as GeminiGenerateContentResponse;
    const contentText = extractResponseText(payload);

    if (!contentText) {
      throw new Error('Gemini assistant provider returned an empty response');
    }

    const parsed = assistantProviderReplySchema.parse(JSON.parse(contentText));
    return normalizeProviderReply(parsed);
  }
}

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

function buildSystemInstruction(language: (typeof preferredLanguages)[number]) {
  const responseLanguage = language === 'hi' ? 'Hindi' : 'English';

  return [
    'You are IntelliFarm Assistant, an India-first farming copilot for farmers.',
    `Reply in ${responseLanguage}.`,
    'Use IntelliFarm account data as the primary source of truth when it exists.',
    'When you use account facts, explicitly label them as coming from IntelliFarm records.',
    'When you add broader agronomy advice beyond the records, explicitly label it as general guidance.',
    'Do not claim to have live web data or real-time official data unless it is present in the provided context.',
    'Never provide an exact pesticide, spray, or chemical dosage unless the dosage is already grounded in the provided context. If the farmer asks for an exact dose without grounded evidence, refuse and recommend local expert or KVK confirmation.',
    'If the issue looks severe, spreading, low-confidence, or financially risky, recommend expert help.',
    'Return only JSON that matches the provided schema.',
    'Use only these cta routes when suggesting actions: /home, /market, /diagnose, /schemes, /expert-help, /crop-plan.',
    'Keep the answer practical, concise, and non-technical.',
  ].join(' ');
}

function buildContents(input: AssistantGenerationInput) {
  const historyParts = input.history.map((turn) => ({
    role: turn.role === 'ASSISTANT' ? 'model' : 'user',
    parts: [
      {
        text: formatHistoryTurn(turn),
      },
    ],
  }));

  return [
    ...historyParts,
    {
      role: 'user',
      parts: [
        {
          text: buildCurrentTurnPrompt(input),
        },
        ...input.currentAttachments.map((attachment) => ({
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.base64Data,
          },
        })),
      ],
    },
  ];
}

function buildCurrentTurnPrompt(input: AssistantGenerationInput) {
  const sections = input.contextSections
    .map((section) => `## ${section.title}\n${section.body}`)
    .join('\n\n');

  return [
    `Farmer message:\n${input.message}`,
    input.originRoute ? `Current screen:\n${input.originRoute}` : null,
    input.safetyFlags.length
      ? `Existing safety flags:\n${input.safetyFlags.join(', ')}`
      : null,
    input.currentAttachments.length
      ? `Current attachments:\n${input.currentAttachments.length} image attachment(s) are included with this turn.`
      : null,
    `Grounded context:\n${sections}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function formatHistoryTurn(turn: AssistantHistoryTurn) {
  const attachmentSummary = turn.attachments.length
    ? `\nAttachments: ${turn.attachments
        .map((attachment) => attachment.fileName)
        .join(', ')}`
    : '';
  return `${turn.content}${attachmentSummary}`;
}

function extractResponseText(payload: GeminiGenerateContentResponse) {
  return payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text?.trim() ?? '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

function normalizeProviderReply(
  reply: z.infer<typeof assistantProviderReplySchema>,
): AssistantProviderReply {
  const spokenSummary = reply.spokenSummary.trim() || summarizeForSpeech(reply.answer);
  return {
    answer: reply.answer.trim(),
    spokenSummary,
    actionCards: reply.actionCards.slice(0, 3),
    suggestedNextStep: reply.suggestedNextStep,
    safetyFlags: [...new Set(reply.safetyFlags.map((flag) => flag.trim()).filter(Boolean))],
    confidenceLabel: reply.confidenceLabel,
  };
}

function summarizeForSpeech(content: string) {
  const cleaned = content.replace(/\s+/g, ' ').trim();
  return cleaned.length > 220 ? `${cleaned.slice(0, 217).trim()}...` : cleaned;
}
