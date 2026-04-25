import { SetMetadata } from '@nestjs/common';

import type { AuthUser } from '../types/authenticated-request';

export const ROLES_KEY = 'roles';

export function Roles(...roles: Array<AuthUser['role']>) {
  return SetMetadata(ROLES_KEY, roles);
}
