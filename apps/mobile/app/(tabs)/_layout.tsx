import { Redirect, Tabs } from "expo-router";

import { FloatingTabBar } from "@/components/floating-tab-bar";
import { LoadingScreen } from "@/components/loading-screen";
import { useSession } from "@/features/session/session-provider";
import { resolveRouteForStep } from "@/lib/routing";
import {
  motion,
  resolveMotionAnimation,
  useReducedMotionPreference,
} from "@/theme/motion";

export default function TabsLayout() {
  const { bootstrapped, isAuthenticated, onboardingStep } = useSession();
  const prefersReducedMotion = useReducedMotionPreference();

  if (!bootstrapped) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (onboardingStep !== "done") {
    return <Redirect href={resolveRouteForStep(onboardingStep)} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: resolveMotionAnimation(
          prefersReducedMotion,
          motion.navigation.tab,
        ),
        freezeOnBlur: true,
        lazy: true,
        tabBarHideOnKeyboard: true,
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="market" options={{ title: "Market" }} />
      <Tabs.Screen name="expenses" options={{ title: "Expense" }} />
      <Tabs.Screen
        name="diagnose"
        options={{ title: "Diagnose", href: null }}
      />
      <Tabs.Screen name="community" options={{ title: "Chat" }} />
      <Tabs.Screen name="voice" options={{ title: "Assistant" }} />
      <Tabs.Screen name="crop-plan" options={{ title: "Plan", href: null }} />
    </Tabs>
  );
}
