import { useState } from 'react';
import { Text, View } from 'react-native';

import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react-native';

import { MotionPressable } from './motion-pressable';
import { palette, radii, spacing, typography } from '@/theme/tokens';

interface AdvancedSettingsAccordionProps {
  children: React.ReactNode;
  title?: string;
  summary?: string;
}

export function AdvancedSettingsAccordion({
  children,
  title = 'Automation',
  summary,
}: AdvancedSettingsAccordionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={{ gap: spacing.xs }}>
      <MotionPressable
        onPress={() => setExpanded((value) => !value)}
        style={{
          backgroundColor: palette.white,
          borderRadius: radii.xl,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: palette.outline,
          padding: spacing.md,
        }}
      >
        <View style={{ gap: spacing.xs }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: radii.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: palette.parchment,
                }}
              >
                <Settings2 size={17} color={palette.inkSoft} />
              </View>
              <Text
                style={{
                  fontFamily: typography.bodyStrong,
                  fontSize: 15,
                  color: palette.ink,
                }}
              >
                {title}
              </Text>
            </View>
            {expanded ? (
              <ChevronUp size={20} color={palette.inkSoft} />
            ) : (
              <ChevronDown size={20} color={palette.inkSoft} />
            )}
          </View>

          {summary ? (
            <Text
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              {summary}
            </Text>
          ) : null}
        </View>
      </MotionPressable>

      {expanded ? (
        <View
          style={{
            backgroundColor: palette.parchmentSoft,
            borderRadius: radii.xl,
            borderCurve: 'continuous',
            padding: spacing.md,
            gap: spacing.md,
            borderWidth: 1,
            borderColor: palette.outline,
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}
