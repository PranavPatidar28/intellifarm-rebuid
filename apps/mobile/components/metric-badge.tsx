import { Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';

export function MetricBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const colors =
    tone === 'success'
      ? { backgroundColor: palette.leafMist, color: palette.leafDark }
      : tone === 'warning'
        ? { backgroundColor: palette.mustardSoft, color: palette.mustard }
        : tone === 'danger'
          ? { backgroundColor: palette.terracottaSoft, color: palette.terracotta }
          : tone === 'info'
            ? { backgroundColor: palette.skySoft, color: palette.sky }
            : { backgroundColor: palette.parchmentSoft, color: palette.inkSoft };

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 7,
        borderRadius: radii.pill,
        backgroundColor: colors.backgroundColor,
      }}
    >
      <Text
        style={{
          color: colors.color,
          fontFamily: typography.bodyStrong,
          fontSize: 11,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
