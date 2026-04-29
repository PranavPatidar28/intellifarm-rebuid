import { Text, View } from 'react-native';

import type { StageVisualState } from '@/lib/crop-plan';
import { palette, radii, semanticColors, spacing, typography } from '@/theme/tokens';

export function StageStatusPill({
  status,
  label,
}: {
  status: StageVisualState;
  label?: string;
}) {
  const tone =
    status === 'completed'
      ? { backgroundColor: semanticColors.successSoft, color: semanticColors.success }
      : status === 'current'
        ? { backgroundColor: semanticColors.warningSoft, color: palette.leafDark }
        : { backgroundColor: palette.parchmentSoft, color: palette.inkSoft };

  const resolvedLabel =
    label ?? (status === 'completed' ? 'Completed' : status === 'current' ? 'Live now' : 'Coming up');

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
        {resolvedLabel}
      </Text>
    </View>
  );
}
