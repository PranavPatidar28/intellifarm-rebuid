import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type View as ViewInstance,
} from 'react-native';

import { Check, ChevronDown, ChevronUp } from 'lucide-react-native';

import { InsetCard } from '@/components/inset-card';
import { MotionPressable } from '@/components/motion-pressable';
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
  const [menuLayout, setMenuLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const triggerRef = useRef<ViewInstance | null>(null);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );
  const expanded = open ?? internalOpen;
  const setExpanded = onOpenChange ?? setInternalOpen;
  const menuWidth = Math.min(
    Math.max(menuLayout.width, 180),
    windowWidth - spacing.lg * 2,
  );
  const optionRowHeight = 46;
  const menuChromeHeight = 16;
  const desiredMenuHeight = options.length * optionRowHeight + menuChromeHeight;

  const updateMenuLayout = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setMenuLayout({ x, y, width, height });
    });
  }, []);

  useEffect(() => {
    if (!expanded) {
      return;
    }

    updateMenuLayout();
  }, [expanded, updateMenuLayout, windowHeight, windowWidth]);

  const closeMenu = () => setExpanded(false);
  const availableBelow = windowHeight - (menuLayout.y + menuLayout.height) - spacing.lg;
  const availableAbove = menuLayout.y - spacing.lg;
  const shouldOpenAbove =
    availableBelow < desiredMenuHeight && availableAbove > availableBelow;
  const menuTop = shouldOpenAbove
    ? Math.max(spacing.lg, menuLayout.y - Math.min(desiredMenuHeight, availableAbove) - spacing.xs)
    : menuLayout.y + menuLayout.height + spacing.xs;
  const menuLeft = Math.min(
    Math.max(spacing.lg, menuLayout.x),
    windowWidth - menuWidth - spacing.lg,
  );
  const menuMaxHeight = Math.max(
    120,
    shouldOpenAbove ? availableAbove : availableBelow,
  );

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

      <View
        ref={triggerRef}
        collapsable={false}
        style={{ position: 'relative', zIndex: expanded ? 60 : 1 }}
      >
        <MotionPressable
          onPress={() => {
            if (!expanded) {
              updateMenuLayout();
            }
            setExpanded(!expanded);
          }}
          contentStyle={{
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
        </MotionPressable>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={expanded}
        onRequestClose={closeMenu}
      >
        <Pressable
          onPress={closeMenu}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
          }}
        >
          <View
            pointerEvents="box-none"
            style={{
              flex: 1,
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: menuTop,
                left: menuLeft,
                width: menuWidth,
                maxHeight: menuMaxHeight,
              }}
            >
              <InsetCard padding={8}>
                <View style={{ gap: 4 }}>
                  {options.map((option) => {
                    const active = option.value === value;

                    return (
                      <MotionPressable
                        key={option.value}
                        onPress={() => {
                          onChange(option.value);
                          closeMenu();
                        }}
                        contentStyle={{
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
                      </MotionPressable>
                    );
                  })}
                </View>
              </InsetCard>
            </View>
          </View>
        </Pressable>
      </Modal>

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
