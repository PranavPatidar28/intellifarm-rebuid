import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { palette, spacing, typography } from '@/theme/tokens';

export function InsightRow({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
        {icon}
        <Text
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 13,
          }}
        >
          {label}
        </Text>
      </View>
      <Text
        style={{
          color: palette.ink,
          fontFamily: typography.bodyStrong,
          fontSize: 13,
          textAlign: 'right',
        }}
      >
        {value}
      </Text>
    </View>
  );
}
