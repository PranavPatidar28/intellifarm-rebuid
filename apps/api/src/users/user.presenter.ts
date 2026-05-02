import type { User } from '@prisma/client';

export function presentUser(user: User) {
  return {
    id: user.id,
    name: user.name ?? '',
    phone: user.phone,
    preferredLanguage: user.preferredLanguage,
    state: user.state ?? '',
    district: user.district ?? '',
    village: user.village ?? '',
    profilePhotoUrl: user.profilePhotoUrl ?? null,
    role: user.role,
    isProfileComplete: Boolean(
      user.name && user.state && user.district && user.village,
    ),
  };
}
