import { apiPost } from '@/lib/api';
import type {
  AssistantMessageResponse,
  AssistantThreadResponse,
} from '@/lib/api-types';

export type AssistantComposerImage = {
  id: string;
  uri: string;
  mimeType: string;
  fileName: string;
};

function buildImagePart(attachment: AssistantComposerImage) {
  return {
    uri: attachment.uri,
    name: attachment.fileName,
    type: attachment.mimeType,
  } as unknown as Blob;
}

export async function createAssistantThread(
  token: string,
  title?: string,
) {
  return apiPost<AssistantThreadResponse>(
    '/assistant/threads',
    title ? { title } : {},
    token,
  );
}

export async function sendAssistantMessage(input: {
  token: string;
  threadId: string;
  content: string;
  focusCropSeasonId?: string;
  focusFarmPlotId?: string;
  originRoute?: string;
  language?: string;
  attachments?: AssistantComposerImage[];
}) {
  const {
    token,
    threadId,
    content,
    focusCropSeasonId,
    focusFarmPlotId,
    originRoute,
    language,
    attachments = [],
  } = input;

  if (!attachments.length) {
    return apiPost<AssistantMessageResponse>(
      `/assistant/threads/${threadId}/messages`,
      {
        content,
        focusCropSeasonId,
        focusFarmPlotId,
        originRoute,
        language,
      },
      token,
    );
  }

  const form = new FormData();
  form.append('content', content);

  if (focusCropSeasonId) {
    form.append('focusCropSeasonId', focusCropSeasonId);
  }

  if (focusFarmPlotId) {
    form.append('focusFarmPlotId', focusFarmPlotId);
  }

  if (originRoute) {
    form.append('originRoute', originRoute);
  }

  if (language) {
    form.append('language', language);
  }

  for (const attachment of attachments.slice(0, 2)) {
    form.append('attachments', buildImagePart(attachment));
  }

  return apiPost<AssistantMessageResponse>(
    `/assistant/threads/${threadId}/messages`,
    form,
    token,
  );
}
