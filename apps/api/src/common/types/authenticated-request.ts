import type { Request } from 'express';

export type AuthUser = {
  sub: string;
  phone: string;
  role: 'FARMER' | 'ADMIN';
  sessionId?: string;
};

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
};
