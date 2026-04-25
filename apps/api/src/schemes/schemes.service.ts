import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchemesService {
  constructor(private readonly prisma: PrismaService) {}

  async listSchemes(
    userId: string,
    query: {
      state?: string;
      category?: string;
      language?: 'en' | 'hi';
      cropName?: string;
      search?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const stateFilter = query.state || user?.state || undefined;
    const language = query.language || user?.preferredLanguage || 'en';
    const andFilters: Array<Record<string, unknown>> = [];

    if (query.category) {
      andFilters.push({
        category: {
          contains: query.category,
          mode: 'insensitive',
        },
      });
    }

    if (query.cropName) {
      andFilters.push({
        OR: [
          {
            relatedCrops: {
              has: query.cropName,
            },
          },
          {
            relatedCrops: {
              has: query.cropName.toLowerCase(),
            },
          },
          {
            relatedCrops: {
              has: query.cropName.toUpperCase(),
            },
          },
        ],
      });
    }

    if (query.search) {
      andFilters.push({
        OR: [
          {
            title: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (stateFilter) {
      andFilters.push({
        OR: [{ applicableState: 'ALL' }, { applicableState: stateFilter }],
      });
    }

    const schemes = await this.prisma.scheme.findMany({
      where: {
        active: true,
        language,
        ...(andFilters.length ? { AND: andFilters } : {}),
      },
      orderBy: [{ applicableState: 'asc' }, { title: 'asc' }],
    });

    return { schemes };
  }
}
