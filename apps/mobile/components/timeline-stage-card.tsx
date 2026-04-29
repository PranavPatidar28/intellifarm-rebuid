import { Text, View } from 'react-native';

import { CheckCircle2, Leaf } from 'lucide-react-native';

import type { TimelineStage } from '@/lib/api-types';
import { palette, radii, semanticColors, spacing, typography } from '@/theme/tokens';

export function TimelineStageCard({
  stage,
  active,
  completed,
}: {
  stage: TimelineStage;
  active: boolean;
  completed: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.md,
      }}
    >
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: radii.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: completed
              ? semanticColors.successSoft
              : active
                ? palette.leaf
                : palette.white,
            borderWidth: 1,
            borderColor: completed || active ? 'transparent' : palette.outline,
          }}
        >
          {completed ? (
            <CheckCircle2 color={semanticColors.success} size={18} />
          ) : (
            <Leaf color={active ? palette.white : palette.leaf} size={16} />
          )}
        </View>
        <View
          style={{
            marginTop: 4,
            width: 3,
            flex: 1,
            minHeight: 58,
            backgroundColor: completed || active ? palette.leaf : palette.outline,
            borderRadius: radii.pill,
          }}
        />
      </View>
      <View
        style={{
          flex: 1,
          marginBottom: spacing.md,
          padding: spacing.md,
          borderRadius: radii.lg,
          borderCurve: 'continuous',
          backgroundColor: active ? palette.leafMist : 'rgba(255,255,255,0.96)',
          borderWidth: 1,
          borderColor: palette.outline,
          gap: spacing.xs,
        }}
      >
        <Text
          style={{
            color: palette.ink,
            fontFamily: typography.bodyStrong,
            fontSize: 16,
          }}
        >
          {stage.labelEn}
        </Text>
        <Text
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 13,
          }}
        >
          Day {stage.startDay} to {stage.endDay}
        </Text>
      </View>
    </View>
  );
}
