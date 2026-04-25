import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import type { AuthUser } from '../common/types/authenticated-request';
import { StorageService } from './storage.service';

@UseGuards(AuthGuard)
@Controller('media')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get(':folder/:filename')
  async serveMedia(
    @CurrentUser() user: AuthUser,
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() response: Response,
  ) {
    const absolutePath = await this.storageService.getAuthorizedFilePath(
      user,
      folder,
      filename,
    );

    response.sendFile(absolutePath);
  }
}
