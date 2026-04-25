import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CropCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listActiveCropDefinitions() {
    const cropDefinitions = await this.prisma.cropDefinition.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        slug: true,
        nameEn: true,
        nameHi: true,
      },
    });

    return { cropDefinitions };
  }
}
