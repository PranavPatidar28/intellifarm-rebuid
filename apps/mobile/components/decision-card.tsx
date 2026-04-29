import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { GradientFeatureCard } from '@/components/gradient-feature-card';
import { palette, spacing, typography } from '@/theme/tokens';

export function DecisionCard({
  eyebrow,
  title,
  body,
  footer,
  colors,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  footer?: ReactNode;
  colors?: readonly [string, string, string] | readonly [string, string];
}) {
  return (
    <GradientFeatureCard colors={colors} padding={16}>
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
        <Text
          style={{
            color: palette.ink,
            fontFamily: typography.bodyStrong,
            fontSize: 18,
            lineHeight: 24,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 13,
            lineHeight: 19,
          }}
        >
          {body}
        </Text>
        {footer}
      </View>
    </GradientFeatureCard>
  );
}
