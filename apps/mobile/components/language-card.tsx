import { Pressable, Text, View } from 'react-native';

import { Volume2 } from 'lucide-react-native';

import { palette, radii, semanticColors, shadow, spacing, typography } from '@/theme/tokens';

type LanguageCardProps = {
  label: string;
  nativeLabel: string;
  active: boolean;
  enabled: boolean;
  onPress: () => void;
};

export function LanguageCard({
  label,
  nativeLabel,
  active,
  enabled,
  onPress,
}: LanguageCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      style={{
        padding: spacing.lg,
        gap: spacing.sm,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: active ? palette.leaf : palette.outline,
        backgroundColor: active ? palette.leafMist : palette.white,
        opacity: enabled ? 1 : 0.58,
        boxShadow: shadow.soft,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: spacing.md,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              color: palette.ink,
              fontFamily: typography.bodyStrong,
              fontSize: 18,
            }}
          >
            {nativeLabel}
          </Text>
          <Text
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 13,
            }}
          >
            {label}
          </Text>
        </View>
        {enabled ? (
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: radii.pill,
              backgroundColor: active ? palette.white : palette.parchmentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Volume2 color={palette.leaf} size={18} />
          </View>
        ) : (
          <View
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: 6,
              borderRadius: radii.pill,
              backgroundColor: semanticColors.schemeSoft,
            }}
          >
            <Text
              style={{
                color: semanticColors.scheme,
                fontFamily: typography.bodyStrong,
                fontSize: 11,
              }}
            >
              Coming soon
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
