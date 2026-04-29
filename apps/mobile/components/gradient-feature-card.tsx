import type { ReactNode } from 'react';
import { View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { radii, shadow } from '@/theme/tokens';

export function GradientFeatureCard({
  children,
  colors,
  padding = 16,
}: {
  children: ReactNode;
  colors?: readonly [string, string, string] | readonly [string, string];
  padding?: number;
}) {
  return (
    <LinearGradient
      colors={colors ? [...colors] : ['#FFFFFF', '#F7F8F3']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        overflow: 'hidden',
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: 'rgba(30,42,34,0.08)',
        boxShadow: shadow.soft,
      }}
    >
      <View style={{ padding }}>{children}</View>
    </LinearGradient>
  );
}
