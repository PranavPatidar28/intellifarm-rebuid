import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { MapPinned, Sprout, UserRound } from 'lucide-react-native';

import { InsetCard } from '@/components/inset-card';
import { StatChip } from '@/components/stat-chip';
import type { AuthUser } from '@/lib/api-types';
import { palette, radii, spacing, typography } from '@/theme/tokens';

export function ProfileHeroCard({
  user,
  farmCount,
  cropCount,
}: {
  user: AuthUser | null;
  farmCount: number;
  cropCount: number;
}) {
  return (
    <InsetCard tone="neutral" padding={16}>
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radii.xl,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: palette.leafMist,
            }}
          >
            <UserRound color={palette.leafDark} size={24} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{
                color: palette.ink,
                fontFamily: typography.bodyStrong,
                fontSize: 19,
              }}
            >
              {user?.name ?? 'Farmer profile'}
            </Text>
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 12,
              }}
            >
              {user ? `${user.village}, ${user.district}, ${user.state}` : 'Profile not loaded'}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatChip
            label="Plots"
            value={String(farmCount)}
            icon={<MapPinned color={palette.sky} size={14} />}
          />
          <StatChip
            label="Crops"
            value={String(cropCount)}
            icon={<Sprout color={palette.leafDark} size={14} />}
          />
        </View>
      </View>
    </InsetCard>
  );
}
