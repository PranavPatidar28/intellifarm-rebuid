import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';

export function WeatherMetricPill({
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
        minWidth: 108,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.pill,
        backgroundColor: 'rgba(255,255,255,0.16)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        gap: 6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        {icon}
        <Text
          style={{
            color: 'rgba(255,255,255,0.78)',
            fontFamily: typography.bodyRegular,
            fontSize: 12,
          }}
        >
          {label}
        </Text>
      </View>
      <Text
        style={{
          color: palette.white,
          fontFamily: typography.bodyStrong,
          fontSize: 15,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
