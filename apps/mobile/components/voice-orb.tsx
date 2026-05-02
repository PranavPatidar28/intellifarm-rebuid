import { Text, View } from 'react-native';

import { Mic } from 'lucide-react-native';

import { MotionPressable } from '@/components/motion-pressable';
import { palette, radii, shadow, spacing, typography } from '@/theme/tokens';

export function VoiceOrb({
  label = 'Ask by voice',
  onPress,
}: {
  label?: string;
  onPress?: () => void;
}) {
  return (
    <MotionPressable
      onPress={onPress}
      contentStyle={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.pill,
        borderCurve: 'continuous',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: palette.white,
        borderWidth: 1,
        borderColor: palette.outline,
        boxShadow: shadow.soft,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: radii.lg,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.leafMist,
        }}
      >
        <Mic color={palette.leafDark} size={18} />
      </View>
      <Text
        style={{
          color: palette.leafDark,
          fontFamily: typography.bodyStrong,
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </MotionPressable>
  );
}
