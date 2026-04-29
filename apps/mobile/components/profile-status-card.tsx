import { Text, View } from 'react-native';

import { CircleAlert, CircleCheckBig } from 'lucide-react-native';

import { InsetCard } from '@/components/inset-card';
import { palette, spacing, typography } from '@/theme/tokens';

export function ProfileStatusCard({
  message,
  tone = 'success',
}: {
  message: string;
  tone?: 'success' | 'warning';
}) {
  const colors =
    tone === 'success'
      ? {
          tone: 'feature' as const,
          icon: <CircleCheckBig color={palette.leafDark} size={18} />,
          title: 'Saved',
        }
      : {
          tone: 'soft' as const,
          icon: <CircleAlert color={palette.mustard} size={18} />,
          title: 'Note',
        };

  return (
    <InsetCard tone={colors.tone} padding={14}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        {colors.icon}
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            style={{
              color: palette.ink,
              fontFamily: typography.bodyStrong,
              fontSize: 14,
            }}
          >
            {colors.title}
          </Text>
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            {message}
          </Text>
        </View>
      </View>
    </InsetCard>
  );
}
