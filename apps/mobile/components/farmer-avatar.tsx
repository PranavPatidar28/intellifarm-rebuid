import { Text, View } from 'react-native';

import { Image } from 'expo-image';

import { getFirstName } from '@/lib/format';
import { palette, typography } from '@/theme/tokens';

export function FarmerAvatar({
  name,
  profilePhotoUrl,
  size = 44,
  borderColor = palette.outline,
  backgroundColor = palette.parchmentSoft,
}: {
  name?: string | null;
  profilePhotoUrl?: string | null;
  size?: number;
  borderColor?: string;
  backgroundColor?: string;
}) {
  const firstName = getFirstName(name);
  const initial = firstName?.slice(0, 1)?.toUpperCase() ?? 'F';

  return (
    <View
      style={{
        width: size,
        height: size,
        overflow: 'hidden',
        borderRadius: size / 2,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor,
      }}
    >
      {profilePhotoUrl ? (
        <Image
          source={profilePhotoUrl}
          contentFit="cover"
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <Text
          style={{
            color: palette.leafDark,
            fontFamily: typography.displayBold,
            fontSize: Math.max(15, Math.round(size * 0.38)),
          }}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}
