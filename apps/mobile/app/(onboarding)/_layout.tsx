import { Redirect, Stack } from 'expo-router';

import { LoadingScreen } from '@/components/loading-screen';
import { useSession } from '@/features/session/session-provider';
import { resolveRouteForStep } from '@/lib/routing';
import { motion, resolveMotionAnimation, useReducedMotionPreference } from '@/theme/motion';

export default function OnboardingLayout() {
  const { bootstrapped, isAuthenticated, onboardingStep } = useSession();
  const prefersReducedMotion = useReducedMotionPreference();

  if (!bootstrapped) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (onboardingStep === 'done') {
    return <Redirect href="/home" />;
  }

  if (onboardingStep === 'language' || onboardingStep === 'login') {
    return <Redirect href={resolveRouteForStep(onboardingStep)} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        animation: resolveMotionAnimation(prefersReducedMotion, motion.navigation.fade),
      }}
    >
      <Stack.Screen name="profile" />
      <Stack.Screen name="plot" />
      <Stack.Screen name="season" />
    </Stack>
  );
}
