import { Redirect, Tabs } from 'expo-router';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { LoadingScreen } from '@/components/loading-screen';
import { useSession } from '@/features/session/session-provider';
import { resolveRouteForStep } from '@/lib/routing';

export default function TabsLayout() {
  const { bootstrapped, isAuthenticated, onboardingStep } = useSession();

  if (!bootstrapped) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (onboardingStep !== 'done') {
    return <Redirect href={resolveRouteForStep(onboardingStep)} />;
  }

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="market" options={{ title: 'Market' }} />
      <Tabs.Screen name="expenses" options={{ title: 'Expense' }} />
      <Tabs.Screen name="diagnose" options={{ title: 'Diagnose', href: null }} />
      <Tabs.Screen name="community" options={{ title: 'Community' }} />
      <Tabs.Screen name="voice" options={{ title: 'Assistant' }} />
      <Tabs.Screen name="crop-plan" options={{ title: 'Plan', href: null }} />
    </Tabs>
  );
}
