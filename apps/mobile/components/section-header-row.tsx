import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { palette, spacing, typography } from '@/theme/tokens';

export function SectionHeaderRow({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: spacing.md,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
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
          }}
        >
          {title}
        </Text>
      </View>
      {action}
    </View>
  );
}
