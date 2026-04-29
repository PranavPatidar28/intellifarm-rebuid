import { Pressable, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';

export function FilterChipRow<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
      {options.map((option) => {
        const active = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: 9,
              borderRadius: radii.pill,
              backgroundColor: active ? palette.leafMist : palette.white,
              borderWidth: 1,
              borderColor: active ? palette.leaf : palette.outline,
            }}
          >
            <Text
              style={{
                color: active ? palette.leafDark : palette.inkSoft,
                fontFamily: active ? typography.bodyStrong : typography.body,
                fontSize: 12,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
