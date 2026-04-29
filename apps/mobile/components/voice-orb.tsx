import { Animated, Pressable, Text, View } from 'react-native';
import { useEffect, useRef } from 'react';

import { Mic } from 'lucide-react-native';

import { palette, radii, shadow, spacing, typography } from '@/theme/tokens';

export function VoiceOrb({
  label = 'Ask by voice',
  onPress,
}: {
  label?: string;
  onPress?: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.05,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <View
          style={{
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
        </View>
      </Animated.View>
    </Pressable>
  );
}
