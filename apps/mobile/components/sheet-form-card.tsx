import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { InsetCard } from '@/components/inset-card';
import { palette, spacing, typography } from '@/theme/tokens';

export function SheetFormCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <InsetCard tone="neutral" padding={16}>
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: 4 }}>
          <Text
            style={{
              color: palette.ink,
              fontFamily: typography.bodyStrong,
              fontSize: 17,
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {children}
      </View>
    </InsetCard>
  );
}
