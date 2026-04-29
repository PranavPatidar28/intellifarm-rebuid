import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { palette, radii, shadow, spacing, typography } from '@/theme/tokens';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'soft';
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  fullWidth = true,
}: ButtonProps) {
  const backgroundColor =
    variant === 'primary'
      ? palette.leaf
      : variant === 'secondary'
        ? palette.mintStrong
        : variant === 'soft'
          ? palette.white
          : 'transparent';
  const borderColor =
    variant === 'ghost'
      ? palette.outlineStrong
      : variant === 'primary'
        ? palette.leafDark
        : palette.outline;
  const textColor =
    variant === 'primary'
      ? palette.white
      : variant === 'secondary'
        ? palette.leafDark
        : variant === 'soft'
          ? palette.leafDark
          : palette.leaf;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        minHeight: 50,
        width: fullWidth ? '100%' : undefined,
        opacity: disabled ? 0.45 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <View
        style={{
          minHeight: 50,
          paddingHorizontal: spacing.lg,
          borderRadius: radii.pill,
          borderCurve: 'continuous',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          borderWidth: 1,
          borderColor,
          backgroundColor,
          boxShadow: variant === 'ghost' ? undefined : shadow.soft,
        }}
      >
        {loading ? <ActivityIndicator color={textColor} /> : icon}
        <Text
          style={{
            color: textColor,
            fontFamily: typography.bodyStrong,
            fontSize: 14,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
