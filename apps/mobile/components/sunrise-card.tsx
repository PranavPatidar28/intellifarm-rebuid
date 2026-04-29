import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { InsetCard } from '@/components/inset-card';
import { palette, spacing, typography } from '@/theme/tokens';

type SunriseCardProps = {
  title?: string;
  eyebrow?: string;
  accent?: 'brand' | 'info' | 'danger' | 'warning' | 'scheme' | 'soft';
  children: ReactNode;
};

export function SunriseCard({
  title,
  eyebrow,
  accent = 'brand',
  children,
}: SunriseCardProps) {
  const tone =
    accent === 'info'
      ? 'feature'
      : accent === 'danger'
        ? 'alert'
        : accent === 'warning'
          ? 'soft'
          : accent === 'scheme'
            ? 'feature'
            : accent === 'soft'
              ? 'soft'
              : 'neutral';

  return (
    <InsetCard tone={tone} padding={16}>
      <View style={{ gap: spacing.sm }}>
        {eyebrow ? (
          <Text
            style={{
              color: palette.inkMuted,
              fontFamily: typography.bodyStrong,
              fontSize: 11,
              textTransform: 'uppercase',
            }}
          >
            {eyebrow}
          </Text>
        ) : null}
        {title ? (
          <Text
            style={{
              color: palette.ink,
              fontFamily: typography.bodyStrong,
              fontSize: 17,
              lineHeight: 22,
            }}
          >
            {title}
          </Text>
        ) : null}
        {children}
      </View>
    </InsetCard>
  );
}
