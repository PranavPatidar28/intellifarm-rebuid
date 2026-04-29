import { Text, View } from 'react-native';

import { MapPinned, Phone, Sprout } from 'lucide-react-native';

import { FarmerAvatar } from '@/components/farmer-avatar';
import { InsetCard } from '@/components/inset-card';
import { StatChip } from '@/components/stat-chip';
import type { AuthUser } from '@/lib/api-types';
import { palette, spacing, typography } from '@/theme/tokens';

export function ProfileHeroCard({
  user,
  farmCount,
  cropCount,
}: {
  user: AuthUser | null;
  farmCount: number;
  cropCount: number;
}) {
  const locationParts = [user?.village, user?.district, user?.state].filter(Boolean);

  return (
    <InsetCard tone="soft" padding={16} borderColor="rgba(47, 125, 78, 0.12)">
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <FarmerAvatar
            name={user?.name}
            profilePhotoUrl={user?.profilePhotoUrl}
            size={72}
            borderColor="rgba(47, 125, 78, 0.16)"
            backgroundColor={palette.white}
          />
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{
                color: palette.ink,
                fontFamily: typography.bodyStrong,
                fontSize: 20,
              }}
            >
              {user?.name ?? 'Farmer profile'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Phone color={palette.leafDark} size={14} />
              <Text
                selectable
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 12,
                }}
              >
                {user?.phone ?? 'Phone not available'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MapPinned color={palette.leafDark} size={14} />
              <Text
                style={{
                  flex: 1,
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 12,
                }}
              >
                {locationParts.length
                  ? locationParts.join(', ')
                  : 'Add your location to localize guidance'}
              </Text>
            </View>
          </View>
        </View>
        
      </View>
    </InsetCard>
  );
}
