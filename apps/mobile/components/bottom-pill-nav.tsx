import { Pressable, Text, View } from 'react-native';

import { palette, radii, shadow, spacing, typography } from '@/theme/tokens';

type NavItem = {
  key: string;
  label: string;
  icon: React.ComponentType<{ color?: string; size?: number }>;
  active: boolean;
  onPress: () => void;
};

export function BottomPillNav({ items }: { items: NavItem[] }) {
  return (
    <View
      style={{
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        backgroundColor: palette.white,
        borderWidth: 1,
        borderColor: palette.outline,
        boxShadow: shadow.medium,
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.xs,
        flexDirection: 'row',
        gap: spacing.xs,
      }}
    >
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Pressable
            key={item.key}
            onPress={item.onPress}
            style={{
              flex: 1,
              minHeight: 58,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              borderRadius: radii.lg,
              backgroundColor: item.active ? palette.leafMist : 'transparent',
              borderWidth: item.active ? 1 : 0,
              borderColor: item.active ? palette.leaf : 'transparent',
            }}
          >
            <Icon color={item.active ? palette.leafDark : palette.inkMuted} size={20} />
            <Text
              style={{
                color: item.active ? palette.leafDark : palette.inkMuted,
                fontFamily: item.active ? typography.bodyStrong : typography.body,
                fontSize: 11,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
