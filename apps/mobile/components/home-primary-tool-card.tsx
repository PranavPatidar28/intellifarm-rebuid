import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { ArrowRight } from 'lucide-react-native';

import { MotionPressable } from '@/components/motion-pressable';
import { palette, radii, shadow, spacing, typography } from '@/theme/tokens';

type HomePrimaryToolTone = 'prediction' | 'diagnosis';

export function HomePrimaryToolCard({
  title,
  icon,
  tone = 'prediction',
  onPress,
}: {
  title: string;
  icon: ReactNode;
  tone?: HomePrimaryToolTone;
  onPress?: () => void;
}) {
  const colors =
    tone === 'diagnosis'
      ? {
          surface: palette.skySoft,
          border: 'rgba(128, 172, 199, 0.24)',
          iconSurface: palette.white,
          accent: palette.sky,
          orb: 'rgba(128, 172, 199, 0.18)',
        }
      : {
          surface: palette.leafMist,
          border: 'rgba(47, 125, 78, 0.18)',
          iconSurface: palette.white,
          accent: palette.leafDark,
          orb: 'rgba(47, 125, 78, 0.14)',
        };

  return (
    <MotionPressable
      onPress={onPress}
      style={{
        flex: 1,
        minWidth: 144,
      }}
      contentStyle={{
          height: 108,
          overflow: 'hidden',
          paddingHorizontal: spacing.md,
          paddingVertical: 14,
          borderRadius: radii.xl,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          boxShadow: shadow.soft,
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: -16,
            right: -8,
            width: 72,
            height: 72,
            borderRadius: radii.pill,
            backgroundColor: colors.orb,
          }}
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.iconSurface,
              boxShadow: '0 8px 18px rgba(31, 46, 36, 0.08)',
            }}
          >
            {icon}
          </View>
          <ArrowRight color={colors.accent} size={17} />
        </View>

        <View style={{ minHeight: 40, justifyContent: 'flex-end' }}>
          <Text
            numberOfLines={2}
            style={{
              color: palette.ink,
              fontFamily: typography.bodyStrong,
              fontSize: 15,
              lineHeight: 20,
            }}
          >
            {title}
          </Text>
        </View>
      </MotionPressable>
  );
}
