import { z } from 'zod';

export const assistantChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        text: z.string().trim().min(1).max(4000),
      }),
    )
    .max(20)
    .optional()
    .default([]),
});

export type AssistantChatRequest = z.infer<typeof assistantChatRequestSchema>;
