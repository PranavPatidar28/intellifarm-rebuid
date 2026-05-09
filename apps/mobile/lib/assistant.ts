import { apiGet, apiPost } from '@/lib/api';
import { File } from 'expo-file-system';

export type AssistantChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  pending?: boolean;
  toolsUsed?: string[];
  imageUris?: string[];
};

type AssistantChatResponse = {
  role: string;
  content: string;
  toolsUsed?: string[];
};

export async function sendAssistantMessage(input: {
  token: string;
  message: string;
  history: AssistantChatMessage[];
  requestId?: string;
  currentImages?: string[];
}) {
  const messages = input.history
    .filter((item) => !item.pending)
    .map((item) => ({
      role: item.role,
      content: item.text,
    }));

  // For the very last message (the current one), if we have images, we need to format it as a multi-modal array
  // The Vercel AI SDK expects an array of text and image parts
  if (input.currentImages && input.currentImages.length > 0 && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user') {
      try {
        const base64Images = await Promise.all(
          input.currentImages.map(async (uri) => {
            const file = new File(uri);
            return await file.base64();
          })
        );

        const multiModalParts: any[] = [];
        if (lastMessage.content && lastMessage.content.trim().length > 0) {
          multiModalParts.push({ type: 'text', text: lastMessage.content });
        }
        
        base64Images.forEach((b64) => {
          multiModalParts.push({
            type: 'image',
            image: `data:image/jpeg;base64,${b64}`,
          });
        });

        lastMessage.content = multiModalParts as any;
      } catch (err) {
        console.error('Error reading image files:', err);
        throw new Error('Failed to process image file');
      }
    }
  }

  // Filter out any historical messages that have completely empty content to prevent AI SDK crashes
  const validMessages = messages.filter(msg => {
    if (typeof msg.content === 'string') return msg.content.trim().length > 0;
    if (Array.isArray(msg.content as any)) return (msg.content as any).length > 0;
    return false;
  });

  try {
    const result = await apiPost<AssistantChatResponse>(
      '/assistant/chat',
      {
        messages: validMessages,
        requestId: input.requestId,
      },
      input.token,
    );

    return { reply: result.content || '', toolsUsed: result.toolsUsed };
  } catch (error) {
    console.error('API Error in sendAssistantMessage:', error);
    throw error;
  }
}

export async function getAssistantStatus(token: string, requestId: string): Promise<{ status: string }> {
  try {
    return await apiGet<{ status: string }>(`/assistant/status/${requestId}`, token);
  } catch (error) {
    return { status: 'Thinking...' };
  }
}

export async function generateAssistantTitle(token: string, message: string): Promise<{ title: string }> {
  try {
    return await apiPost<{ title: string }>(
      '/assistant/title',
      { message },
      token,
    );
  } catch (error) {
    return { title: 'New conversation' };
  }
}
