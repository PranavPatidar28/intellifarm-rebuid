import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { presentUser } from './user.presenter';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        farmPlots: {
          include: {
            cropSeasons: {
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      user: presentUser(user),
      farmCount: user.farmPlots.length,
      farms: user.farmPlots,
    };
  }

  async updateProfile(
    userId: string,
    payload: {
      name: string;
      preferredLanguage: 'en' | 'hi';
      state: string;
      district: string;
      village: string;
    },
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: payload,
    });

    return {
      user: presentUser(user),
    };
  }

  async uploadProfilePhoto(userId: string, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Profile photo is required');
    }

    const profilePhotoUrl = await this.storageService.saveFile(
      file,
      'profile-photos',
    );
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { profilePhotoUrl },
    });

    return {
      user: presentUser(user),
    };
  }
}
