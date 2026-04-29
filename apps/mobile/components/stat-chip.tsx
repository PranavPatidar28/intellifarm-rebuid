import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';

export function StatChip({
  label,
  value,
  icon,
  minWidth = 92,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  minWidth?: number;
}) {
  return (
    <View
      style={{
        minWidth,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        backgroundColor: palette.white,
        borderWidth: 1,
        borderColor: palette.outline,
        gap: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon}
        <Text
          style={{
            color: palette.inkMuted,
            fontFamily: typography.bodyStrong,
            fontSize: 10,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
      </View>
      <Text
        style={{
          color: palette.ink,
          fontFamily: typography.bodyStrong,
          fontSize: 14,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
