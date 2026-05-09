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
});

export class AssistantChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string | Array<any>;
  }> = [];
}
