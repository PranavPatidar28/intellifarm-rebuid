import { ActivityIndicator, Text, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { palette, spacing, typography } from '@/theme/tokens';

export function LoadingScreen({
  label = 'Preparing your field companion',
}: {
  label?: string;
}) {
  return (
    <LinearGradient
      colors={['#1f5d3d', '#366f47', '#8b6b36']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
      }}
    >
      <ActivityIndicator color={palette.white} size="large" />
      <Text
        style={{
          color: 'rgba(255,255,255,0.86)',
          fontFamily: typography.bodyStrong,
          fontSize: 16,
        }}
      >
        {label}
      </Text>
    </LinearGradient>
  );
}
