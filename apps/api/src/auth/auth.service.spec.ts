import { UnauthorizedException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';

/**
 * Auth is the first thing every demo login hits, so these tests cover the
 * OTP lifecycle end to end with mocked Prisma/JWT/config: request → verify
 * (happy path + expiry + wrong code) → refresh → logout.
 */

type ConfigMap = Record<string, string | undefined>;

function makeConfig(overrides: ConfigMap = {}) {
  const values: ConfigMap = {
    DEV_OTP_CODE: '123456',
    NODE_ENV: 'test',
    JWT_ACCESS_SECRET: 'access-secret-for-tests-only',
    JWT_REFRESH_SECRET: 'refresh-secret-for-tests-only',
    ACCESS_TOKEN_TTL: '15m',
    REFRESH_TOKEN_TTL: '30d',
    ...overrides,
  };
  return {
    get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback),
    getOrThrow: jest.fn((key: string) => {
      const value = values[key];
      if (value === undefined) {
        throw new Error(`Missing config: ${key}`);
      }
      return value;
    }),
  };
}

function makeResponse() {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response & {
    cookie: jest.Mock;
    clearCookie: jest.Mock;
  };
}

function makeRequest(cookies: Record<string, string> = {}): Request {
  return {
    headers: { 'user-agent': 'jest' },
    cookies,
  } as unknown as Request;
}

const demoUser = {
  id: 'user-1',
  phone: '9876543210',
  role: 'FARMER' as const,
  name: null,
  preferredLanguage: 'en',
  state: null,
  district: null,
  village: null,
  photoUrl: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('AuthService', () => {
  describe('requestOtp', () => {
    it('creates a challenge and returns the dev OTP outside production', async () => {
      const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
      const create = jest.fn().mockResolvedValue({ id: 'otp-1' });
      const service = new AuthService(
        { otpChallenge: { deleteMany, create } } as never,
        {} as never,
        makeConfig() as never,
      );

      const result = await service.requestOtp({ phone: '9876543210' });

      expect(deleteMany).toHaveBeenCalledWith({
        where: { phone: '9876543210', verifiedAt: null },
      });
      expect(create).toHaveBeenCalledTimes(1);
      // The stored OTP must be hashed, never plaintext.
      const createArg = create.mock.calls[0][0] as {
        data: { otpHash: string };
      };
      expect(createArg.data.otpHash).not.toBe('123456');
      expect(result.devOtp).toBe('123456');
    });

    it('hides the dev OTP in production', async () => {
      const service = new AuthService(
        {
          otpChallenge: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            create: jest.fn().mockResolvedValue({ id: 'otp-1' }),
          },
        } as never,
        {} as never,
        makeConfig({ NODE_ENV: 'production' }) as never,
      );

      const result = await service.requestOtp({ phone: '9876543210' });

      expect(result.devOtp).toBeUndefined();
    });
  });

  describe('verifyOtp', () => {
    it('rejects when there is no active challenge', async () => {
      const service = new AuthService(
        {
          otpChallenge: { findFirst: jest.fn().mockResolvedValue(null) },
        } as never,
        {} as never,
        makeConfig() as never,
      );

      await expect(
        service.verifyOtp(
          { phone: '9876543210', otp: '123456' },
          makeRequest(),
          makeResponse(),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an expired challenge', async () => {
      const service = new AuthService(
        {
          otpChallenge: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'otp-1',
              otpHash: 'whatever',
              expiresAt: new Date(Date.now() - 1000),
            }),
          },
        } as never,
        {} as never,
        makeConfig() as never,
      );

      await expect(
        service.verifyOtp(
          { phone: '9876543210', otp: '123456' },
          makeRequest(),
          makeResponse(),
        ),
      ).rejects.toThrow('OTP expired. Please request a new one.');
    });

    it('increments attempt count and rejects an incorrect OTP', async () => {
      const update = jest.fn().mockResolvedValue({});
      const service = new AuthService(
        {
          otpChallenge: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'otp-1',
              otpHash: await hash('123456', 10),
              expiresAt: new Date(Date.now() + 60_000),
            }),
            update,
          },
        } as never,
        {} as never,
        makeConfig() as never,
      );

      await expect(
        service.verifyOtp(
          { phone: '9876543210', otp: '000000' },
          makeRequest(),
          makeResponse(),
        ),
      ).rejects.toThrow('Incorrect OTP. Please try again.');
      expect(update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { attemptCount: { increment: 1 } },
      });
    });

    it('verifies a valid OTP, issues tokens, and sets cookies', async () => {
      const response = makeResponse();
      const service = new AuthService(
        {
          otpChallenge: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'otp-1',
              otpHash: await hash('123456', 10),
              expiresAt: new Date(Date.now() + 60_000),
            }),
            update: jest.fn().mockResolvedValue({}),
          },
          user: { upsert: jest.fn().mockResolvedValue(demoUser) },
          authSession: {
            create: jest.fn().mockResolvedValue({ id: 'session-1' }),
            update: jest.fn().mockResolvedValue({}),
          },
        } as never,
        {
          signAsync: jest
            .fn()
            .mockResolvedValueOnce('access-token')
            .mockResolvedValueOnce('refresh-token'),
        } as never,
        makeConfig() as never,
      );

      const result = await service.verifyOtp(
        { phone: '9876543210', otp: '123456' },
        makeRequest(),
        response,
      );

      expect(result.accessToken).toBe('access-token');
      expect(result.user.phone).toBe('9876543210');
      // Both auth cookies must be set, httpOnly.
      expect(response.cookie).toHaveBeenCalledWith(
        'access_token',
        'access-token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(response.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token',
        expect.objectContaining({ httpOnly: true }),
      );
    });
  });

  describe('refresh', () => {
    it('rejects when the refresh cookie is missing', async () => {
      const service = new AuthService(
        {} as never,
        {} as never,
        makeConfig() as never,
      );

      await expect(
        service.refresh(makeRequest(), makeResponse()),
      ).rejects.toThrow('Refresh token missing');
    });

    it('rejects a revoked or unknown session', async () => {
      const service = new AuthService(
        {
          authSession: { findUnique: jest.fn().mockResolvedValue(null) },
        } as never,
        {
          verifyAsync: jest.fn().mockResolvedValue({
            sub: 'user-1',
            phone: '9876543210',
            role: 'FARMER',
            sessionId: 'session-1',
          }),
        } as never,
        makeConfig() as never,
      );

      await expect(
        service.refresh(
          makeRequest({ refresh_token: 'some-token' }),
          makeResponse(),
        ),
      ).rejects.toThrow('Session invalid');
    });
  });

  describe('logout', () => {
    it('revokes the session and clears both cookies', async () => {
      const updateMany = jest.fn().mockResolvedValue({ count: 1 });
      const response = makeResponse();
      const service = new AuthService(
        { authSession: { updateMany } } as never,
        {
          verifyAsync: jest.fn().mockResolvedValue({ sessionId: 'session-1' }),
        } as never,
        makeConfig() as never,
      );

      const result = await service.logout(
        makeRequest({ refresh_token: 'some-token' }),
        response,
      );

      expect(result).toEqual({ success: true });
      expect(updateMany).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { revokedAt: expect.any(Date) },
      });
      expect(response.clearCookie).toHaveBeenCalledWith('access_token', {
        path: '/',
      });
      expect(response.clearCookie).toHaveBeenCalledWith('refresh_token', {
        path: '/',
      });
    });

    it('still clears cookies when no refresh token is present', async () => {
      const response = makeResponse();
      const service = new AuthService(
        {} as never,
        {} as never,
        makeConfig() as never,
      );

      const result = await service.logout(makeRequest(), response);

      expect(result).toEqual({ success: true });
      expect(response.clearCookie).toHaveBeenCalledTimes(2);
    });
  });
});
