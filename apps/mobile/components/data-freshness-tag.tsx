import { Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';

export function DataFreshnessTag({
  label,
  tone = 'live',
}: {
  label: string;
  tone?: 'live' | 'cached' | 'stale';
}) {
  const color =
    tone === 'live' ? palette.leaf : tone === 'cached' ? palette.sky : palette.terracotta;
  const backgroundColor =
    tone === 'live'
      ? 'rgba(217,234,223,0.92)'
      : tone === 'cached'
        ? 'rgba(220,238,255,0.92)'
        : 'rgba(249,226,215,0.96)';

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 7,
        borderRadius: radii.pill,
        backgroundColor,
      }}
    >
      <Text
        style={{
          color,
          fontFamily: typography.bodyStrong,
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
