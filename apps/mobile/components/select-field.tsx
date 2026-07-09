import { useCallback, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  Text,
  UIManager,
  View,
} from 'react-native';

import { Check, ChevronDown } from 'lucide-react-native';

import { palette, radii, spacing, typography } from '@/theme/tokens';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

type SelectFieldProps = {
  label: string;
  value: string;
  options: ReadonlyArray<SelectOption>;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Optional helper text shown beneath the field. */
  helper?: string;
  /** Controlled open state. When provided, the dropdown is controlled by the parent. */
  open?: boolean;
  /** Called when the dropdown wants to change its open state (controlled mode). */
  onOpenChange?: (open: boolean) => void;
};

export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  helper,
  open,
  onOpenChange,
}: SelectFieldProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);

  const isControlled = open !== undefined;
  const expanded = isControlled ? open : internalExpanded;

  const setExpanded = useCallback(
    (next: boolean) => {
      if (isControlled) {
        onOpenChange?.(next);
      } else {
        setInternalExpanded(next);
      }
    },
    [isControlled, onOpenChange],
  );

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption?.label ?? placeholder;

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  }, [expanded, setExpanded]);

  const handleSelect = useCallback(
    (optionValue: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onChange(optionValue);
      setExpanded(false);
    },
    [onChange, setExpanded],
  );

  return (
    <View style={{ gap: spacing.xs }}>
      <Text
        style={{
          color: palette.ink,
          fontFamily: typography.bodyStrong,
          fontSize: 14,
        }}
      >
        {label}
      </Text>

      <Pressable
        onPress={toggle}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md,
          paddingVertical: 14,
          borderRadius: radii.lg,
          borderCurve: 'continuous',
          backgroundColor: palette.white,
          borderWidth: 1,
          borderColor: expanded ? palette.leaf : palette.outline,
          boxShadow: expanded
            ? '0 6px 16px rgba(47, 125, 78, 0.10)'
            : '0 4px 12px rgba(31, 46, 36, 0.04)',
        }}
      >
        <Text
          style={{
            flex: 1,
            color: selectedOption ? palette.ink : palette.inkMuted,
            fontFamily: selectedOption
              ? typography.bodyStrong
              : typography.bodyRegular,
            fontSize: 15,
          }}
        >
          {displayLabel}
        </Text>

        <View
          style={{
            transform: [{ rotate: expanded ? '180deg' : '0deg' }],
          }}
        >
          <ChevronDown
            color={expanded ? palette.leaf : palette.inkSoft}
            size={18}
            strokeWidth={2.2}
          />
        </View>
      </Pressable>

      {expanded && (
        <View
          style={{
            borderRadius: radii.lg,
            borderCurve: 'continuous',
            backgroundColor: palette.white,
            borderWidth: 1,
            borderColor: palette.outline,
            overflow: 'hidden',
            boxShadow: '0 8px 20px rgba(31, 46, 36, 0.08)',
          }}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isLast = index === options.length - 1;

            return (
              <Pressable
                key={option.value}
                onPress={() => handleSelect(option.value)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingHorizontal: spacing.md,
                  paddingVertical: 14,
                  backgroundColor: pressed
                    ? palette.leafMist
                    : isSelected
                      ? 'rgba(47, 125, 78, 0.05)'
                      : 'transparent',
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: palette.outline,
                })}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      color: isSelected ? palette.leafDark : palette.ink,
                      fontFamily: isSelected
                        ? typography.bodyStrong
                        : typography.bodyRegular,
                      fontSize: 15,
                    }}
                  >
                    {option.label}
                  </Text>
                  {option.description ? (
                    <Text
                      style={{
                        color: palette.inkSoft,
                        fontFamily: typography.bodyRegular,
                        fontSize: 12,
                        lineHeight: 17,
                      }}
                    >
                      {option.description}
                    </Text>
                  ) : null}
                </View>

                {isSelected && (
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: palette.leaf,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check color={palette.white} size={13} strokeWidth={3} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {helper ? (
        <Text
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 12,
            lineHeight: 17,
          }}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
}
