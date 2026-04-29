import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { palette, spacing, typography } from '@/theme/tokens';

export function AppTopBar({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.md,
      }}
    >
      <View style={{ flex: 1, gap: spacing.xs }}>
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
            fontFamily: typography.display,
            fontSize: 27,
            lineHeight: 32,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 13,
              lineHeight: 20,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}
