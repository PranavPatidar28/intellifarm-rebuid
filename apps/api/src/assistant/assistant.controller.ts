import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/authenticated-request';
import { AssistantService } from './assistant.service';
import {
  AssistantChatRequestSchema,
  AssistantVoiceSessionRequestSchema,
  type AssistantChatRequest,
} from './assistant.schemas';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { VoiceSessionStoreService } from './voice-session-store.service';
import { VoiceTicketService } from './voice-ticket.service';

@Controller('assistant')
export class AssistantController {
  constructor(
    private readonly assistantService: AssistantService,
    private readonly prisma: PrismaService,
    private readonly ticketService: VoiceTicketService,
    private readonly voiceSessionStore: VoiceSessionStoreService,
  ) {}

  @Post('chat')
  @UseGuards(AuthGuard)
  // Chat is sent as multipart FormData (the AI SDK stringifies `messages`).
  // The service does not consume uploaded files, so no MIME/size filter here —
  // adding one would reject legitimate requests while protecting nothing.
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
      } catch {
        // ignore
      }
    }

    const payload = AssistantChatRequestSchema.parse(
      parsedBody,
    ) as AssistantChatRequest;
    const result = await this.assistantService.chat(payload, user.sub);

    const allToolCalls =
      result.steps?.flatMap(
        (step: any) => step.toolCalls?.map((tc: any) => tc.toolName) || [],
      ) || [];
    const uniqueToolsUsed = Array.from(
      new Set([...(result.intelliFarmToolsUsed ?? []), ...allToolCalls]),
    );

    return {
      role: 'assistant',
      content: result.text || '',
      toolsUsed: uniqueToolsUsed,
    };
  }

  @Get('status/:requestId')
  @UseGuards(AuthGuard)
  getStatus(@Req() req: Request, @CurrentUser() _user: AuthUser) {
    const requestId = req.params.requestId as string;
    const status = this.assistantService.getStatus(requestId) || 'Thinking...';
    return { status };
  }

  @Post('voice/sessions')
  @UseGuards(AuthGuard)
  async createVoiceSession(
    @Req() req: Request,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ) {
    const payload = AssistantVoiceSessionRequestSchema.parse(body);

    if (payload.focusFarmPlotId) {
      const farm = await this.prisma.farmPlot.findFirst({
        where: {
          id: payload.focusFarmPlotId,
          userId: user.sub,
        },
        select: { id: true },
      });

      if (!farm) {
        throw new BadRequestException('Selected farm plot is not available.');
      }
    }

    if (payload.focusCropSeasonId) {
      const season = await this.prisma.cropSeason.findFirst({
        where: {
          id: payload.focusCropSeasonId,
          farmPlot: { userId: user.sub },
        },
        select: {
          id: true,
          farmPlotId: true,
        },
      });

      if (!season) {
        throw new BadRequestException('Selected crop season is not available.');
      }
    }

    const record = this.voiceSessionStore.create({
      userId: user.sub,
      clientIp: req.ip ?? req.socket.remoteAddress ?? 'unknown',
      preferredLanguage: payload.preferredLanguage,
      focusFarmPlotId: payload.focusFarmPlotId ?? null,
      focusCropSeasonId: payload.focusCropSeasonId ?? null,
      resumeSessionId: payload.resumeSessionId ?? null,
    });
    const ticket = await this.ticketService.createTicket({
      type: 'assistant-voice',
      sid: record.id,
      sub: user.sub,
    });

    return {
      voiceSessionId: record.id,
      ticket: ticket.token,
      websocketPath: `/voice?ticket=${ticket.token}`,
      expiresAt: ticket.expiresAt,
      reconnectGraceSeconds: this.voiceSessionStore.getReconnectGraceSeconds(),
    };
  }

  @Post('title')
  @UseGuards(AuthGuard)
  async generateTitle(
    @Body() body: { message: string },
    @CurrentUser() _user: AuthUser,
  ) {
    const title = await this.assistantService.generateTitle(body.message);
    return { title };
  }
}
