import { Text, View } from 'react-native';

import { MotionPressable } from '@/components/motion-pressable';
import { palette, radii, spacing, typography } from '@/theme/tokens';

export function ExpenseScopeSwitch<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4,
        borderRadius: radii.pill,
        backgroundColor: palette.mintStrong,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <MotionPressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
            }}
            contentStyle={{
              minHeight: 48,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radii.pill,
              backgroundColor: active ? palette.white : 'transparent',
            }}
          >
            <Text
              style={{
                color: active ? palette.ink : palette.inkSoft,
                fontFamily: active ? typography.bodyStrong : typography.body,
                fontSize: 14,
              }}
            >
              {option.label}
            </Text>
          </MotionPressable>
        );
      })}
    </View>
  );
}
