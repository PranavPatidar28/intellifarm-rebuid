import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  function createContext(user?: { role: 'FARMER' | 'ADMIN' }) {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
    } as never;
  }

  it('allows access when no roles are required', () => {
    const guard = new RolesGuard({
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('blocks requests without an authenticated user context', () => {
    const guard = new RolesGuard({
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector);

    expect(() => guard.canActivate(createContext())).toThrow(
      ForbiddenException,
    );
  });

  it('blocks farmers from admin-only routes', () => {
    const guard = new RolesGuard({
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector);

    expect(() => guard.canActivate(createContext({ role: 'FARMER' }))).toThrow(
      'Admin access is required',
    );
  });

  it('allows admins onto admin-only routes', () => {
    const guard = new RolesGuard({
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector);

    expect(guard.canActivate(createContext({ role: 'ADMIN' }))).toBe(true);
  });
});
