import { StyleSheet, View, type ViewStyle } from 'react-native';

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CalendarDays, ChartColumnBig, House, Sparkles, WalletCards } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { BottomPillNav } from '@/components/bottom-pill-nav';

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const activeOptions = descriptors[state.routes[state.index]?.key]?.options;
  const flattenedStyle = StyleSheet.flatten(activeOptions?.tabBarStyle) as ViewStyle | undefined;
  const activeRouteName = state.routes[state.index]?.name;

  if (flattenedStyle?.display === 'none') {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <BottomPillNav
        items={[
          {
            key: 'home',
            label: 'Home',
            icon: House,
            active: activeRouteName === 'home',
            onPress: () => navigation.navigate('home'),
          },
          {
            key: 'crop-plan',
            label: 'Plan',
            icon: CalendarDays,
            active: activeRouteName === 'crop-plan',
            onPress: () => navigation.navigate('crop-plan'),
          },
          {
            key: 'voice',
            label: 'AI Chat',
            icon: Sparkles,
            active: activeRouteName === 'voice',
            hero: true,
            onPress: () => navigation.navigate('voice'),
          },
          {
            key: 'market',
            label: 'Market',
            icon: ChartColumnBig,
            active: activeRouteName === 'market',
            onPress: () => navigation.navigate('market'),
          },
          {
            key: 'expenses',
            label: 'Expense',
            icon: WalletCards,
            active: false,
            onPress: () => router.push('/expenses'),
          },
        ]}
      />
    </View>
  );
}
