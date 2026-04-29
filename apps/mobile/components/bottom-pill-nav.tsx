import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, typography } from '@/theme/tokens';

type NavItem = {
  key: string;
  label: string;
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  active: boolean;
  hero?: boolean;
  onPress: () => void;
};

export function BottomPillNav({ items }: { items: NavItem[] }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: palette.white,
        borderTopColor: 'rgba(30, 42, 34, 0.08)',
        borderTopWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: Math.max(insets.bottom, 8),
        paddingHorizontal: 12,
        paddingTop: 8,
      }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isHero = item.hero;
        const textColor = item.active ? palette.leafDark : '#4B4E54';

        return (
          <Pressable
            key={item.key}
            hitSlop={8}
            onPress={item.onPress}
            style={{
              alignItems: 'center',
              gap: 4,
              height: 58,
              justifyContent: 'flex-end',
              width: isHero ? 80 : 68,
            }}
          >
            {!isHero ? (
              <View
                style={{
                  backgroundColor: item.active ? palette.leafDark : 'transparent',
                  borderRadius: 5,
                  height: 3,
                  marginBottom: 2,
                  width: 28,
                }}
              />
            ) : (
              <View style={{ height: 5 }} />
            )}

            {isHero ? (
              <View
                style={{
                  alignItems: 'center',
                  marginTop: -18,
                }}
              >
                <View
                  style={{
                    backgroundColor: palette.white,
                    borderTopLeftRadius: 18,
                    borderTopRightRadius: 18,
                    height: 18,
                    marginBottom: -10,
                    width: 58,
                  }}
                />
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: item.active ? palette.leafDark : 'rgba(78, 78, 78, 0.07)',
                    borderColor: palette.white,
                    borderRadius: 999,
                    borderCurve: 'continuous',
                    borderWidth: 4,
                    boxShadow: item.active
                      ? '0 10px 22px rgba(6, 95, 70, 0.24)'
                      : '0 8px 18px rgba(31, 46, 36, 0.14)',
                    justifyContent: 'center',
                    padding: 12,
                  }}
                >
                  <Icon
                    color={item.active ? palette.white : palette.leafDark}
                    size={24}
                    strokeWidth={2.2}
                  />
                </View>
              </View>
            ) : (
              <Icon color={textColor} size={22} strokeWidth={item.active ? 2.4 : 2.1} />
            )}

            <Text
              style={{
                color: textColor,
                fontFamily: item.active ? typography.bodyStrong : typography.bodyRegular,
                fontSize: 11,
                lineHeight: 16,
                textAlign: 'center',
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
