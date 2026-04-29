import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import {
  communityFeedQuerySchema,
  createCommunityPostSchema,
  createCommunityReplySchema,
  reportCommunityContentSchema,
} from '@intellifarm/contracts';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import type { AuthUser } from '../common/types/authenticated-request';
import { parseWithSchema } from '../common/utils/zod.util';
import { CommunityService } from './community.service';

const reportBodySchema = reportCommunityContentSchema.omit({ targetType: true });

@ApiTags('community')
@UseGuards(AuthGuard)
@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('feed')
  listFeed(@CurrentUser() user: AuthUser, @Query() query: Record<string, unknown>) {
    return this.communityService.listFeed(
      user,
      parseWithSchema(communityFeedQuerySchema, query),
    );
  }

  @Get('me/posts')
  listMyPosts(@CurrentUser() user: AuthUser, @Query() query: Record<string, unknown>) {
    return this.communityService.listMyPosts(
      user,
      parseWithSchema(communityFeedQuerySchema, query),
    );
  }

  @Get('posts/:id')
  getPost(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.communityService.getPost(user, id);
  }

  @Post('posts')
  @UseInterceptors(FileInterceptor('image'))
  createPost(
    @CurrentUser() user: AuthUser,
    @Body() body: Record<string, unknown>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.communityService.createPost(
      user,
      parseWithSchema(createCommunityPostSchema, body),
      file,
    );
  }

  @Post('posts/:id/replies')
  createReply(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.communityService.createReply(
      user,
      id,
      parseWithSchema(createCommunityReplySchema, body),
    );
  }

  @Post('posts/:id/like')
  toggleLike(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.communityService.toggleLike(user, id);
  }

  @Post('posts/:id/save')
  toggleSave(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.communityService.toggleSave(user, id);
  }

  @Post('posts/:id/report')
  reportPost(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.communityService.reportPost(
      user,
      id,
      parseWithSchema(reportBodySchema, body),
    );
  }

  @Post('replies/:id/report')
  reportReply(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.communityService.reportReply(
      user,
      id,
      parseWithSchema(reportBodySchema, body),
    );
  }
}
