import { useEffect, type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { motion, motionEasing, useReducedMotionPreference } from '@/theme/motion';

export function MotionSection({
  children,
  style,
  delay = 0,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
}) {
  const prefersReducedMotion = useReducedMotionPreference();
  const revealProgress = useSharedValue(prefersReducedMotion ? 1 : 0);

  useEffect(() => {
    if (prefersReducedMotion) {
      revealProgress.value = 1;
      return;
    }

    revealProgress.value = withDelay(
      delay,
      withTiming(1, {
        duration: motion.duration.sectionReveal,
        easing: motionEasing.standard,
      }),
    );
  }, [delay, prefersReducedMotion, revealProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: revealProgress.value,
      transform: [
        {
          translateY:
            (1 - revealProgress.value) * motion.distance.sectionReveal,
        },
      ],
    };
  });

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
