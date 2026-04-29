import { Pressable, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';

export function OptionChipGroup({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        style={{
          color: palette.ink,
          fontFamily: typography.bodyStrong,
          fontSize: 14,
        }}
      >
        {title}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {options.map((option) => {
          const active = option.value === value;

          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: 10,
                borderRadius: radii.pill,
                borderWidth: 1,
                borderColor: active ? palette.leaf : palette.outline,
                backgroundColor: active ? palette.leaf : palette.white,
              }}
            >
              <Text
                style={{
                  color: active ? palette.white : palette.inkSoft,
                  fontFamily: active ? typography.bodyStrong : typography.bodyRegular,
                  fontSize: 13,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
