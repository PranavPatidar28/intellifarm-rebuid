import { Text, View } from 'react-native';

import { Sparkles } from 'lucide-react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.xl,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: palette.outline,
        backgroundColor: palette.white,
      }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radii.pill,
          backgroundColor: palette.mustardSoft,
        }}
      >
        <Sparkles color={palette.mustard} size={24} />
      </View>
      <Text
        style={{
          color: palette.ink,
          fontFamily: typography.bodyStrong,
          fontSize: 17,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: palette.inkSoft,
          fontFamily: typography.bodyRegular,
          fontSize: 14,
          lineHeight: 22,
          textAlign: 'center',
        }}
      >
        {description}
      </Text>
    </View>
  );
}
