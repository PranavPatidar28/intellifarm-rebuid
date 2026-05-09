import { apiPost } from '@/lib/api';

export type AssistantChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  pending?: boolean;
};

type AssistantChatResponse = {
  role: string;
  content: string;
};

export async function sendAssistantMessage(input: {
  token: string;
  message: string;
  history: AssistantChatMessage[];
}) {
  const messages = input.history
    .filter((item) => !item.pending && item.text.trim().length > 0)
    .map((item) => ({
      role: item.role,
      content: item.text,
    }));

  const result = await apiPost<AssistantChatResponse>(
    '/assistant/chat',
    {
      messages,
    },
    input.token,
  );

  return { reply: result.content || '' };
}
