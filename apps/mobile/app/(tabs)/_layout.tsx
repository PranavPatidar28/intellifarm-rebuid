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
      <Tabs.Screen name="crop-plan" options={{ title: 'Plan' }} />
      <Tabs.Screen name="diagnose" options={{ title: 'Diagnose' }} />
      <Tabs.Screen
        name="market"
        options={{ title: 'Market', tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen name="voice" options={{ title: 'Voice' }} />
    </Tabs>
  );
}
