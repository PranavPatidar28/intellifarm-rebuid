import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

import {
  createAssistantMessageSchema,
  createAssistantThreadSchema,
} from '@intellifarm/contracts';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import type { AuthUser } from '../common/types/authenticated-request';
import { parseWithSchema } from '../common/utils/zod.util';
import { AssistantService } from './assistant.service';

@ApiTags('assistant')
@UseGuards(AuthGuard)
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Get('threads')
  listThreads(@CurrentUser() user: AuthUser) {
    return this.assistantService.listThreads(user.sub);
  }

  @Post('threads')
  createThread(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.assistantService.createThread(
      user.sub,
      parseWithSchema(createAssistantThreadSchema, body),
    );
  }

  @Get('threads/:id')
  getThread(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.assistantService.getThread(user.sub, id);
  }

  @Post('threads/:id/messages')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'attachments', maxCount: 2 }]))
  createMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @UploadedFiles()
    files: {
      attachments?: Express.Multer.File[];
    },
  ) {
    return this.assistantService.createMessage(
      user.sub,
      id,
      parseWithSchema(createAssistantMessageSchema, body),
      files.attachments ?? [],
    );
  }
}
