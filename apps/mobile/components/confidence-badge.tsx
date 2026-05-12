import { Text, View } from 'react-native';

import { palette, radii, semanticColors, spacing, typography } from '@/theme/tokens';

export function ConfidenceBadge({ score, hidePercentage }: { score: number; hidePercentage?: boolean }) {
  const percent = Math.round(score * 100);
  const tone =
    percent >= 45
      ? { backgroundColor: semanticColors.successSoft, color: semanticColors.success, label: 'High confidence' }
      : { backgroundColor: semanticColors.dangerSoft, color: semanticColors.danger, label: 'Low confidence' };

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
        {tone.label}{!hidePercentage && ` • ${percent}%`}
      </Text>
    </View>
  );
}
