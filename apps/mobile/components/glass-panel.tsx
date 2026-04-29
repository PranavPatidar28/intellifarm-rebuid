import type { ReactNode } from 'react';
import { View } from 'react-native';

import { BlurView } from 'expo-blur';

import { radii, shadow, surfaces } from '@/theme/tokens';

export function GlassPanel({
  children,
  padding = 18,
}: {
  children: ReactNode;
  padding?: number;
}) {
  return (
    <BlurView
      intensity={36}
      tint="light"
      style={{
        overflow: 'hidden',
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: surfaces.glass.borderColor,
        backgroundColor: surfaces.glass.backgroundColor,
        boxShadow: shadow.medium,
      }}
    >
      <View style={{ padding }}>{children}</View>
    </BlurView>
  );
}
