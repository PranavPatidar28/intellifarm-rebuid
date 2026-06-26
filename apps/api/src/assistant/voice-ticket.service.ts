import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { VoiceSessionTicketPayload } from './voice.types';

@Injectable()
export class VoiceTicketService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async createTicket(payload: VoiceSessionTicketPayload) {
    const ttlSeconds = this.getTicketTtlSeconds();
    const token = await this.jwtService.signAsync(payload, {
      secret: this.getSecret(),
      expiresIn: ttlSeconds,
    });

    return {
      token,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      ttlSeconds,
    };
  }

  verifyTicket(token: string) {
    try {
      return this.jwtService.verify<VoiceSessionTicketPayload>(token, {
        secret: this.getSecret(),
      });
    } catch {
      throw new UnauthorizedException(
        'Voice session ticket is invalid or expired.',
      );
    }
  }

  getTicketTtlSeconds() {
    return this.configService.get<number>(
      'VOICE_SESSION_TICKET_TTL_SECONDS',
      120,
    );
  }

  private getSecret() {
    return (
      this.configService.get<string>('VOICE_SESSION_TICKET_SECRET') ??
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET')
    );
  }
}
