import type { ReactNode } from 'react';
import { View } from 'react-native';

import { palette, radii, shadow, surfaces } from '@/theme/tokens';

export function InsetCard({
  children,
  padding = 16,
  tone = 'neutral',
  borderColor,
}: {
  children: ReactNode;
  padding?: number;
  tone?: 'neutral' | 'soft' | 'feature' | 'alert';
  borderColor?: string;
}) {
  const surface =
    tone === 'soft'
      ? surfaces.soft
      : tone === 'feature'
        ? surfaces.feature
        : tone === 'alert'
          ? surfaces.alert
          : surfaces.neutral;

  return (
    <View
      style={{
        padding,
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: borderColor ?? surface.borderColor,
        backgroundColor: surface.backgroundColor,
        boxShadow: shadow.soft,
      }}
    >
      {children}
    </View>
  );
}
