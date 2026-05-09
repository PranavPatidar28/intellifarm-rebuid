import { Body, Controller, Post, UseGuards, Req, UseInterceptors } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/authenticated-request';
import { AssistantService } from './assistant.service';
import type { AssistantChatRequest } from './assistant.schemas';
import type { Request } from 'express';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('chat')
  @UseGuards(AuthGuard)
  @UseInterceptors(AnyFilesInterceptor())
  async chat(
    @Req() req: Request,
    @Body() body: any,
    @CurrentUser() user: AuthUser,
  ) {
    let parsedBody = body;
    
    // If sent as FormData, the AI SDK stringifies the messages array into the 'messages' field
    if (typeof body.messages === 'string') {
      try {
        parsedBody = { ...body, messages: JSON.parse(body.messages) };
      } catch (e) {
        // ignore
      }
    }

    console.log('Content-Type:', req.headers['content-type']);
    const result = await this.assistantService.chat(parsedBody as AssistantChatRequest, user.sub);
    
    console.log('Result from AssistantService:', {
      text: result.text,
      toolCalls: result.toolCalls,
      finishReason: result.finishReason,
      steps: result.steps?.length
    });

    const allToolCalls = result.steps?.flatMap((step: any) => step.toolCalls?.map((tc: any) => tc.toolName) || []) || [];
    const uniqueToolsUsed = Array.from(new Set(allToolCalls));

    return {
      role: 'assistant',
      content: result.text || '',
      toolsUsed: uniqueToolsUsed,
    };
  }
}
