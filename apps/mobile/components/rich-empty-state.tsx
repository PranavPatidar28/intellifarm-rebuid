import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { GradientFeatureCard } from '@/components/gradient-feature-card';
import { gradients, palette, spacing, typography } from '@/theme/tokens';

export function RichEmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <GradientFeatureCard colors={gradients.neutralGlass}>
      <View style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
        {icon}
        <Text
          style={{
            color: palette.ink,
            fontFamily: typography.display,
            fontSize: 20,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 14,
            lineHeight: 21,
          }}
        >
          {description}
        </Text>
      </View>
    </GradientFeatureCard>
  );
}
