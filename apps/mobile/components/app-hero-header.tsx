import type { ReactNode } from 'react';
import { View } from 'react-native';

import { AppTopBar } from '@/components/app-top-bar';
import { palette, spacing } from '@/theme/tokens';

export function AppHeroHeader({
  eyebrow,
  title,
  subtitle,
  hero,
  action,
  tone = 'sunrise',
  topPadding = spacing.xl,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  hero?: ReactNode;
  action?: ReactNode;
  tone?: 'sunrise' | 'weather' | 'market' | 'scheme' | 'assistant';
  topPadding?: number;
}) {
  const backgroundColor =
    tone === 'weather'
      ? palette.skySoft
      : tone === 'market'
        ? palette.mustardSoft
        : tone === 'scheme'
          ? palette.lilacSoft
          : tone === 'assistant'
            ? palette.mint
            : palette.canvas;

  return (
    <View
      style={{
        paddingHorizontal: spacing.lg,
        paddingTop: topPadding,
        paddingBottom: spacing.sm,
        backgroundColor,
      }}
    >
      <AppTopBar
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        action={action}
      />
      {hero ? <View style={{ marginTop: spacing.md }}>{hero}</View> : null}
    </View>
  );
}
