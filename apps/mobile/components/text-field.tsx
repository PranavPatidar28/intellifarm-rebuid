import type { ReactNode } from 'react';
import { Text, TextInput, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';

type TextFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  helper?: string;
  error?: string | null;
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
  multiline?: boolean;
  trailing?: ReactNode;
};

export function TextField({
  label,
  value,
  placeholder,
  onChangeText,
  onFocus,
  helper,
  error,
  keyboardType = 'default',
  multiline = false,
  trailing,
}: TextFieldProps) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text
        style={{
          color: palette.ink,
          fontFamily: typography.bodyStrong,
          fontSize: 13,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          minHeight: multiline ? 112 : 52,
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: multiline ? spacing.md : spacing.sm,
          borderRadius: radii.lg,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: error ? palette.terracotta : palette.outline,
          backgroundColor: palette.white,
        }}
      >
        <TextInput
          value={value}
          placeholder={placeholder}
          placeholderTextColor={palette.inkMuted}
          onChangeText={onChangeText}
          onFocus={onFocus}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={{
            flex: 1,
            minHeight: multiline ? 86 : undefined,
            color: palette.ink,
            fontFamily: typography.bodyRegular,
            fontSize: 14,
          }}
        />
        {trailing}
      </View>
      {error ? (
        <Text
          style={{
            color: palette.terracotta,
            fontFamily: typography.bodyRegular,
            fontSize: 11,
          }}
        >
          {error}
        </Text>
      ) : helper ? (
        <Text
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 11,
          }}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
}
