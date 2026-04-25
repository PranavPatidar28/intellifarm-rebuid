import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import type {
  AuthenticatedRequest,
  AuthUser,
} from '../types/authenticated-request';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const verifiedPayload: unknown = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      const payload = verifiedPayload as AuthUser;
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }
  }

  private extractToken(request: Request) {
    const bearer = request.headers.authorization
      ?.replace(/^Bearer\s+/i, '')
      .trim();
    if (bearer) {
      return bearer;
    }

    const cookies: unknown = request.cookies;
    if (!cookies || typeof cookies !== 'object') {
      return null;
    }

    const cookieToken = (cookies as Record<string, unknown>).access_token;
    return typeof cookieToken === 'string' ? cookieToken : null;
  }
}
