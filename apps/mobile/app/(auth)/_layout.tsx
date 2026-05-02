import { Stack } from 'expo-router';

import { motion, resolveMotionAnimation, useReducedMotionPreference } from '@/theme/motion';

export default function AuthLayout() {
  const prefersReducedMotion = useReducedMotionPreference();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        animation: resolveMotionAnimation(prefersReducedMotion, motion.navigation.fade),
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="language" />
      <Stack.Screen name="login" />
    </Stack>
  );
}
