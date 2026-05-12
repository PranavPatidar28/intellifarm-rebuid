import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, stepCountIs } from 'ai';

import { buildAssistantSystemPrompt } from './assistant-prompt.config';
import { AssistantInteractionLogService } from './assistant-interaction-log.service';
import { AssistantToolRegistryService } from './assistant-tool-registry.service';
import type { AssistantSessionContext } from './assistant.types';
import type { AssistantChatRequest } from './assistant.schemas';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly statusMap = new Map<string, { text: string; timestamp: number }>();

  constructor(
    private readonly configService: ConfigService,
    private readonly interactionLogService: AssistantInteractionLogService,
    private readonly toolRegistry: AssistantToolRegistryService,
  ) {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.statusMap.entries()) {
        if (now - value.timestamp > 5 * 60 * 1000) {
          this.statusMap.delete(key);
        }
      }
    }, 60 * 1000).unref?.();
  }

  setStatus(requestId: string, status: string) {
    this.statusMap.set(requestId, { text: status, timestamp: Date.now() });
  }

  getStatus(requestId: string) {
    return this.statusMap.get(requestId)?.text;
  }

  async chat(payload: AssistantChatRequest, userId: string): Promise<any> {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('AI_ASSISTANT_API_KEY');

    if (!apiKey) {
      throw new ServiceUnavailableException('Gemini API key is not configured');
    }

    if (!payload.messages || !Array.isArray(payload.messages)) {
      throw new BadRequestException('Messages array is required');
    }

    const modelName =
      this.configService.get<string>('AI_ASSISTANT_MODEL') || 'gemini-1.5-flash';
    const google = createGoogleGenerativeAI({ apiKey });
    const session: AssistantSessionContext = {
      userId,
      channel: 'TEXT',
      requestId: payload.requestId ?? null,
    };
    const toolsUsed = new Set<string>();

    try {
      if (payload.requestId) {
        this.setStatus(payload.requestId, 'Analyzing request...');
      }

      const mappedMessages = payload.messages.map((message: any) => ({
        role: message.role,
        content: message.content ?? message.parts ?? [],
      }));

      const result = await generateText({
        model: google(modelName),
        system: buildAssistantSystemPrompt({
          channel: 'TEXT',
          session,
        }),
        messages: mappedMessages,
        tools: this.toolRegistry.createAiSdkTools(
          {
            session,
            historyMessages: payload.messages as any,
            allowSideEffects: false,
          },
          (toolName, toolResult) => {
            toolsUsed.add(toolName);
            if (payload.requestId) {
              this.setStatus(
                payload.requestId,
                toolResult.requiresConfirmation
                  ? 'Waiting for confirmation...'
                  : `Using ${toolName}...`,
              );
            }
          },
        ),
        stopWhen: stepCountIs(5),
      } as any);

      const lastUserMessage = [...payload.messages]
        .reverse()
        .find((message) => message.role === 'user');

      this.logger.debug(`Gemini output text: "${result.text}" | Tools: ${Array.from(toolsUsed).join(', ')}`);

      await this.interactionLogService.createLog(session, {
        userQuery: extractText(lastUserMessage?.content) || '(text request)',
        assistantSummary: result.text,
        toolsUsed: [...toolsUsed],
      });

      return {
        text: result.text,
        steps: result.steps,
        intelliFarmToolsUsed: [...toolsUsed],
      };
    } catch (error) {
      this.logger.warn(
        `Gemini chat failed. ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.interactionLogService.createLog(session, {
        userQuery: extractText(payload.messages.at(-1)?.content) || '(text request)',
        toolsUsed: [...toolsUsed],
        errorCode: 'gemini_text_failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw new BadGatewayException('Gemini request failed');
    }
  }

  async generateTitle(message: string): Promise<string> {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('AI_ASSISTANT_API_KEY');

    if (!apiKey) {
      throw new ServiceUnavailableException('Gemini API key is not configured');
    }

    const modelName =
      this.configService.get<string>('AI_ASSISTANT_MODEL') || 'gemini-1.5-flash';
    const google = createGoogleGenerativeAI({ apiKey });

    try {
      const result = await generateText({
        model: google(modelName),
        system:
          "You are a title generator. Generate a very short, 4-5 word description of the user's request. Return only the title.",
        prompt: message,
      });

      return result.text || 'New conversation';
    } catch (error) {
      this.logger.warn(`Failed to generate title: ${String(error)}`);
      return 'New conversation';
    }
  }
}

function extractText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map((part) => {
      if (part && typeof part === 'object' && 'text' in part) {
        return String((part as { text?: unknown }).text ?? '');
      }
      if (part && typeof part === 'object' && (part as { type?: string }).type === 'image') {
        return '[image]';
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
}
