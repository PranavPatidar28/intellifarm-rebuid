import { Pressable, Text, View } from 'react-native';

import type { ReactNode } from 'react';

import { palette, radii, spacing, typography } from '@/theme/tokens';

export function HomeUtilityShortcut({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        minWidth: 136,
      }}
    >
      <View
        style={{
          minHeight: 46,
          paddingHorizontal: spacing.md,
          borderRadius: radii.lg,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: palette.outline,
          backgroundColor: palette.white,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <View
          style={{
            width: 30,
            height: 30,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            backgroundColor: palette.parchmentSoft,
          }}
        >
          {icon}
        </View>
        <Text
          style={{
            color: palette.ink,
            fontFamily: typography.bodyStrong,
            fontSize: 13,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
