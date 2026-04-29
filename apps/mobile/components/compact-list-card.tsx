import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { InsetCard } from '@/components/inset-card';
import { palette, spacing, typography } from '@/theme/tokens';

export function CompactListCard({
  title,
  subtitle,
  meta,
  prefix,
  trailing,
  onPress,
  tone = 'neutral',
  children,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  prefix?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  tone?: 'neutral' | 'soft' | 'feature' | 'alert';
  children?: ReactNode;
}) {
  const content = (
    <InsetCard tone={tone} padding={14}>
      <View style={{ gap: spacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', gap: spacing.sm, flex: 1 }}>
            {prefix ? <View>{prefix}</View> : null}
            <View style={{ flex: 1, gap: 3 }}>
              <Text
                style={{
                  color: palette.ink,
                  fontFamily: typography.bodyStrong,
                  fontSize: 15,
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
          </View>
          {trailing}
        </View>
        {meta ? (
          <Text
            style={{
              color: palette.inkMuted,
              fontFamily: typography.bodyRegular,
              fontSize: 11,
            }}
          >
            {meta}
          </Text>
        ) : null}
        {children}
      </View>
    </InsetCard>
  );

  if (!onPress) {
    return content;
  }

  return <Pressable onPress={onPress}>{content}</Pressable>;
}
