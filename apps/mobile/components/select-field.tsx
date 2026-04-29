import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Check, ChevronDown, ChevronUp } from 'lucide-react-native';

import { InsetCard } from '@/components/inset-card';
import { palette, radii, shadow, spacing, typography } from '@/theme/tokens';

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder,
  helper,
  open,
  onOpenChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  placeholder?: string;
  helper?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );
  const expanded = open ?? internalOpen;
  const setExpanded = onOpenChange ?? setInternalOpen;

  return (
    <View
      style={{
        gap: spacing.xs,
        position: 'relative',
        zIndex: expanded ? 60 : 1,
      }}
    >
      <Text
        style={{
          color: palette.inkMuted,
          fontFamily: typography.bodyStrong,
          fontSize: 11,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>

      <View style={{ position: 'relative', zIndex: expanded ? 60 : 1 }}>
        <Pressable
          onPress={() => setExpanded(!expanded)}
          style={{
            minHeight: 50,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radii.xl,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: expanded ? palette.leaf : palette.outline,
            backgroundColor: expanded ? palette.white : palette.parchmentSoft,
            boxShadow: expanded ? '0 10px 22px rgba(31, 46, 36, 0.08)' : shadow.soft,
          }}
        >
          <Text
            style={{
              flex: 1,
              color: selectedOption ? palette.ink : palette.inkMuted,
              fontFamily: selectedOption ? typography.bodyStrong : typography.bodyRegular,
              fontSize: 14,
            }}
          >
            {selectedOption?.label ?? placeholder ?? 'Select'}
          </Text>
          {expanded ? (
            <ChevronUp color={palette.inkSoft} size={18} />
          ) : (
            <ChevronDown color={palette.inkSoft} size={18} />
          )}
        </Pressable>

        {expanded ? (
          <View
            style={{
              position: 'absolute',
              top: 56,
              left: 0,
              right: 0,
              zIndex: 80,
            }}
          >
            <InsetCard padding={8}>
              <View style={{ gap: 4 }}>
                {options.map((option) => {
                  const active = option.value === value;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        onChange(option.value);
                        setExpanded(false);
                      }}
                      style={{
                        minHeight: 42,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: spacing.sm,
                        paddingHorizontal: spacing.md,
                        paddingVertical: 10,
                        borderRadius: radii.md,
                        borderCurve: 'continuous',
                        backgroundColor: active ? palette.leafMist : palette.white,
                      }}
                    >
                      <Text
                        style={{
                          flex: 1,
                          color: active ? palette.leafDark : palette.inkSoft,
                          fontFamily: active ? typography.bodyStrong : typography.bodyRegular,
                          fontSize: 13,
                        }}
                      >
                        {option.label}
                      </Text>
                      {active ? <Check color={palette.leafDark} size={16} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </InsetCard>
          </View>
        ) : null}
      </View>

      {helper ? (
        <Text
          style={{
            color: palette.inkMuted,
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
