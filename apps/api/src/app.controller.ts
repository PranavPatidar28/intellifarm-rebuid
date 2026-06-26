import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { PrismaService } from './prisma/prisma.service';

@ApiTags('platform')
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getRoot() {
    return {
      name: 'Intellifarm API',
      version: '1.0.0',
      docs: '/docs',
    };
  }

  /**
   * Liveness + readiness probe. Pings the database so a load balancer can
   * detect a degraded instance (returns 503 if the DB is unreachable).
   *
   * The ping is bounded by a short timeout: a hung connection must fail the
   * probe fast rather than block for Prisma's default timeout, which would
   * otherwise cause a load balancer to wait then evict an arguably-live pod.
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  async getHealth() {
    const HEALTH_DB_TIMEOUT_MS = 1500;
    let database: 'up' | 'down' = 'down';
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_resolve, reject) =>
          setTimeout(
            () => reject(new Error('health db timeout')),
            HEALTH_DB_TIMEOUT_MS,
          ),
        ),
      ]);
      database = 'up';
    } catch {
      database = 'down';
    }

    const body = {
      ok: database === 'up',
      timestamp: new Date().toISOString(),
      checks: { database },
    };

    if (database !== 'up') {
      throw new ServiceUnavailableException(body);
    }

    return body;
  }
}
