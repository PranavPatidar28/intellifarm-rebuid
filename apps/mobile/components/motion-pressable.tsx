import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { motion, motionEasing, useReducedMotionPreference } from '@/theme/motion';

type MotionPressableProps = Omit<PressableProps, 'children' | 'style'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  pressedOpacity?: number;
  pressedScale?: number;
  duration?: number;
};

export function MotionPressable({
  children,
  style,
  contentStyle,
  disabled,
  onPressIn,
  onPressOut,
  pressedOpacity = motion.opacity.pressed,
  pressedScale = motion.scale.pressed,
  duration = motion.duration.press,
  ...pressableProps
}: MotionPressableProps) {
  const prefersReducedMotion = useReducedMotionPreference();
  const pressProgress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    if (disabled) {
      return {
        opacity: 0.45,
        transform: [{ scale: 1 }],
      };
    }

    if (prefersReducedMotion) {
      return {
        opacity: 1,
        transform: [{ scale: 1 }],
      };
    }

    const scaleRange = 1 - pressedScale;
    const opacityRange = 1 - pressedOpacity;

    return {
      opacity: 1 - opacityRange * pressProgress.value,
      transform: [{ scale: 1 - scaleRange * pressProgress.value }],
    };
  }, [disabled, prefersReducedMotion, pressedOpacity, pressedScale]);

  const setPressedState = (nextValue: 0 | 1) => {
    if (disabled || prefersReducedMotion) {
      pressProgress.value = 0;
      return;
    }

    pressProgress.value = withTiming(nextValue, {
      duration,
      easing: motionEasing.standard,
    });
  };

  return (
    <Pressable
      {...pressableProps}
      disabled={disabled}
      onPressIn={(event) => {
        setPressedState(1);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressedState(0);
        onPressOut?.(event);
      }}
      style={style}
    >
      <Animated.View style={[contentStyle, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
