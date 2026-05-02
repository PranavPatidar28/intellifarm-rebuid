import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';

import { AppHeroHeader } from '@/components/app-hero-header';
import { palette, spacing } from '@/theme/tokens';

type PageShellProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  hero?: ReactNode;
  action?: ReactNode;
  heroTone?: 'sunrise' | 'weather' | 'market' | 'scheme' | 'assistant';
  children: ReactNode;
  scrollProps?: ScrollViewProps;
};

export function PageShellHeader({
  eyebrow,
  title,
  subtitle,
  hero,
  action,
  heroTone = 'sunrise',
}: Omit<PageShellProps, 'children' | 'scrollProps'>) {
  return (
    <AppHeroHeader
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      hero={hero}
      action={action}
      tone={heroTone}
    />
  );
}

export function PageShell({
  eyebrow,
  title,
  subtitle,
  hero,
  action,
  heroTone = 'sunrise',
  children,
  scrollProps,
}: PageShellProps) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: 138,
        backgroundColor: palette.canvas,
      }}
      {...scrollProps}
    >
      <PageShellHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        hero={hero}
        action={action}
        heroTone={heroTone}
      />

      <View
        style={{
          gap: spacing.md,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
        }}
      >
        {children}
      </View>
    </ScrollView>
  );
}
