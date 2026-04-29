import { Text, View } from 'react-native';

import { palette, radii, semanticColors, spacing, typography } from '@/theme/tokens';

export function RiskBadge({
  value,
}: {
  value: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'WATCH';
}) {
  const tone =
    value === 'LOW'
      ? { backgroundColor: semanticColors.successSoft, color: semanticColors.success }
      : value === 'MEDIUM' || value === 'WATCH'
        ? { backgroundColor: semanticColors.warningSoft, color: semanticColors.warning }
        : { backgroundColor: semanticColors.dangerSoft, color: semanticColors.danger };

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 7,
        borderRadius: radii.pill,
        backgroundColor: tone.backgroundColor,
      }}
    >
      <Text
        style={{
          color: tone.color,
          fontFamily: typography.bodyStrong,
          fontSize: 12,
        }}
      >
        {value === 'CRITICAL'
          ? 'Urgent risk'
          : value === 'HIGH'
            ? 'High risk'
            : value === 'WATCH'
              ? 'Watch closely'
              : value === 'MEDIUM'
                ? 'Medium risk'
                : 'Low risk'}
      </Text>
    </View>
  );
}
