import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import type { AuthUser } from '../common/types/authenticated-request';
import { parseWithSchema } from '../common/utils/zod.util';
import { AssistantService } from './assistant.service';
import { assistantChatRequestSchema } from './assistant.schemas';

@ApiTags('assistant')
@UseGuards(AuthGuard)
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('chat')
  chat(
    @CurrentUser() _user: AuthUser,
    @Body() body: unknown,
  ) {
    return this.assistantService.chat(
      parseWithSchema(assistantChatRequestSchema, body),
    );
  }
}
