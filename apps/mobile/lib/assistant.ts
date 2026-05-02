import { apiPost } from '@/lib/api';

export type AssistantChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  pending?: boolean;
};

type AssistantChatResponse = {
  reply: string;
};

export async function sendAssistantMessage(input: {
  token: string;
  message: string;
  history: AssistantChatMessage[];
}) {
  const history = input.history
    .filter((item) => !item.pending && item.text.trim().length > 0)
    .slice(-20)
    .map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      text: item.text,
    }));

  return apiPost<AssistantChatResponse>(
    '/assistant/chat',
    {
      message: input.message,
      history,
    },
    input.token,
  );
}
