import { z } from 'zod';

export const AssistantChatMessagePartSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    text: z.string(),
  }),
  z.object({
    type: z.literal('image'),
    image: z.string(), // base64 or URL
    mimeType: z.string().optional(),
  }),
]);

export const AssistantChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.union([z.string(), z.array(AssistantChatMessagePartSchema)]),
});

export const AssistantChatRequestSchema = z.object({
  messages: z.array(AssistantChatMessageSchema),
  requestId: z.string().optional(),
});

export const AssistantVoiceSessionRequestSchema = z.object({
  focusFarmPlotId: z.string().optional(),
  focusCropSeasonId: z.string().optional(),
  preferredLanguage: z.enum(['en', 'hi']).optional(),
  resumeSessionId: z.string().optional(),
});

export class AssistantChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string | Array<any>;
  }> = [];
  requestId?: string;
}

export class AssistantVoiceSessionRequest {
  focusFarmPlotId?: string;
  focusCropSeasonId?: string;
  preferredLanguage?: 'en' | 'hi';
  resumeSessionId?: string;
}
