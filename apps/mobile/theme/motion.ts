import { AccessibilityInfo } from 'react-native';
import { useEffect, useState } from 'react';

import { Easing } from 'react-native-reanimated';

export const motion = {
  duration: {
    press: 120,
    tab: 180,
    sectionReveal: 180,
  },
  scale: {
    pressed: 0.985,
  },
  opacity: {
    pressed: 0.94,
  },
  distance: {
    sectionReveal: 8,
  },
  navigation: {
    detailPush: 'simple_push',
    fade: 'fade',
    none: 'none',
    tab: 'fade',
  },
} as const;

export const motionEasing = {
  standard: Easing.out(Easing.cubic),
} as const;

export function useReducedMotionPreference() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    let active = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) {
        setPrefersReducedMotion(value);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (value) => {
        setPrefersReducedMotion(value);
      },
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return prefersReducedMotion;
}

export function resolveMotionAnimation<TAnimation extends string>(
  prefersReducedMotion: boolean,
  animation: TAnimation,
) {
  return prefersReducedMotion ? motion.navigation.none : animation;
}
