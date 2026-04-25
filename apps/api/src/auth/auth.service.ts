import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash, compare } from 'bcryptjs';
import type { Request, Response } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import { presentUser } from '../users/user.presenter';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async requestOtp({ phone }: { phone: string }) {
    const otp = this.configService.get<string>('DEV_OTP_CODE', '123456');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpChallenge.deleteMany({
      where: {
        phone,
        verifiedAt: null,
      },
    });

    await this.prisma.otpChallenge.create({
      data: {
        phone,
        otpHash: await hash(otp, 10),
        expiresAt,
      },
    });

    return {
      message: 'OTP generated',
      expiresAt: expiresAt.toISOString(),
      devOtp:
        this.configService.get<string>('NODE_ENV') === 'production'
          ? undefined
          : otp,
    };
  }

  async verifyOtp(
    payload: { phone: string; otp: string },
    request: Request,
    response: Response,
  ) {
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: {
        phone: payload.phone,
        verifiedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!challenge || challenge.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('OTP expired. Please request a new one.');
    }

    const isValidOtp = await compare(payload.otp, challenge.otpHash);
    if (!isValidOtp) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attemptCount: { increment: 1 } },
      });
      throw new UnauthorizedException('Incorrect OTP. Please try again.');
    }

    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { verifiedAt: new Date() },
    });

    const user = await this.prisma.user.upsert({
      where: { phone: payload.phone },
      update: {},
      create: { phone: payload.phone },
    });

    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: 'pending',
        userAgent: request.headers['user-agent'],
        deviceType: this.detectDeviceType(request),
        expiresAt: new Date(
          Date.now() + this.ttlToMilliseconds(this.refreshTtl()),
        ),
      },
    });

    const tokens = await this.issueTokens(
      user.id,
      user.phone,
      user.role,
      session.id,
    );

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { refreshTokenHash: await hash(tokens.refreshToken, 10) },
    });

    this.setCookies(response, tokens.accessToken, tokens.refreshToken);

    return {
      user: presentUser(user),
      needsOnboarding: !presentUser(user).isProfileComplete,
      accessToken: tokens.accessToken,
    };
  }

  async refresh(request: Request, response: Response) {
    const refreshToken = this.readCookie(request, REFRESH_COOKIE);
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    let payload: {
      sub: string;
      phone: string;
      role: 'FARMER' | 'ADMIN';
      sessionId: string;
    };
    try {
      const verifiedPayload: unknown = await this.jwtService.verifyAsync(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );
      payload = verifiedPayload as {
        sub: string;
        phone: string;
        role: 'FARMER' | 'ADMIN';
        sessionId: string;
      };
    } catch {
      throw new UnauthorizedException('Refresh token expired');
    }

    const session = await this.prisma.authSession.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() < Date.now() ||
      !(await compare(refreshToken, session.refreshTokenHash))
    ) {
      throw new UnauthorizedException('Session invalid');
    }

    const tokens = await this.issueTokens(
      session.user.id,
      session.user.phone,
      session.user.role,
      session.id,
    );

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: await hash(tokens.refreshToken, 10),
        expiresAt: new Date(
          Date.now() + this.ttlToMilliseconds(this.refreshTtl()),
        ),
      },
    });

    this.setCookies(response, tokens.accessToken, tokens.refreshToken);

    return {
      user: presentUser(session.user),
      accessToken: tokens.accessToken,
    };
  }

  async logout(request: Request, response: Response) {
    const refreshToken = this.readCookie(request, REFRESH_COOKIE);

    if (refreshToken) {
      try {
        const verifiedPayload: unknown = await this.jwtService.verifyAsync<{
          sessionId: string;
        }>(refreshToken, {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        });
        const payload = verifiedPayload as { sessionId: string };

        await this.prisma.authSession.updateMany({
          where: { id: payload.sessionId },
          data: { revokedAt: new Date() },
        });
      } catch {
        // Ignore invalid refresh tokens during logout.
      }
    }

    response.clearCookie(ACCESS_COOKIE, { path: '/' });
    response.clearCookie(REFRESH_COOKIE, { path: '/' });

    return { success: true };
  }

  async getAuthMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      user: presentUser(user),
    };
  }

  private async issueTokens(
    userId: string,
    phone: string,
    role: 'FARMER' | 'ADMIN',
    sessionId: string,
  ) {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: userId,
        phone,
        role,
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: Math.floor(this.ttlToMilliseconds(this.accessTtl()) / 1000),
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: userId,
        phone,
        role,
        sessionId,
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: Math.floor(this.ttlToMilliseconds(this.refreshTtl()) / 1000),
      },
    );

    return { accessToken, refreshToken };
  }

  private setCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const secure = this.configService.get<string>('NODE_ENV') === 'production';

    response.cookie(ACCESS_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: this.ttlToMilliseconds(this.accessTtl()),
    });

    response.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: this.ttlToMilliseconds(this.refreshTtl()),
    });
  }

  private accessTtl() {
    return this.configService.get<string>('ACCESS_TOKEN_TTL', '15m');
  }

  private refreshTtl() {
    return this.configService.get<string>('REFRESH_TOKEN_TTL', '30d');
  }

  private ttlToMilliseconds(value: string) {
    const amount = Number.parseInt(value, 10);
    if (value.endsWith('m')) return amount * 60 * 1000;
    if (value.endsWith('h')) return amount * 60 * 60 * 1000;
    if (value.endsWith('d')) return amount * 24 * 60 * 60 * 1000;
    if (value.endsWith('s')) return amount * 1000;
    throw new BadRequestException(`Unsupported TTL format: ${value}`);
  }

  private readCookie(request: Request, key: string) {
    const cookies: unknown = request.cookies;

    if (!cookies || typeof cookies !== 'object') {
      return null;
    }

    const value = (cookies as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : null;
  }

  private detectDeviceType(request: Request) {
    const userAgent = request.headers['user-agent']?.toLowerCase() ?? '';

    if (userAgent.includes('android') || userAgent.includes('iphone')) {
      return 'mobile';
    }

    return 'web';
  }
}
