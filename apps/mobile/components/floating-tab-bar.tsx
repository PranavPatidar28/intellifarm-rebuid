import { StyleSheet, View, type ViewStyle } from 'react-native';

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CalendarDays, Camera, ChartColumnBig, House, Mic } from 'lucide-react-native';

import { BottomPillNav } from '@/components/bottom-pill-nav';
import { spacing } from '@/theme/tokens';

const icons = {
  home: House,
  'crop-plan': CalendarDays,
  diagnose: Camera,
  market: ChartColumnBig,
  voice: Mic,
} as const;

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const activeOptions = descriptors[state.routes[state.index]?.key]?.options;
  const flattenedStyle = StyleSheet.flatten(activeOptions?.tabBarStyle) as ViewStyle | undefined;

  if (flattenedStyle?.display === 'none') {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        bottom: spacing.lg,
      }}
    >
      <BottomPillNav
        items={state.routes.map((route, index) => {
          const Icon = icons[route.name as keyof typeof icons] ?? House;
          const { options } = descriptors[route.key];
          const label =
            typeof options.title === 'string'
              ? options.title
              : route.name === 'crop-plan'
                ? 'Plan'
                : route.name.charAt(0).toUpperCase() + route.name.slice(1);

          return {
            key: route.key,
            label,
            icon: Icon,
            active: state.index === index,
            onPress: () => navigation.navigate(route.name),
          };
        })}
      />
    </View>
  );
}
