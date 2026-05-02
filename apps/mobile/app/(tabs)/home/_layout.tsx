import { Stack } from 'expo-router';

import { motion, resolveMotionAnimation, useReducedMotionPreference } from '@/theme/motion';

export default function HomeStackLayout() {
  const prefersReducedMotion = useReducedMotionPreference();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        animation: resolveMotionAnimation(
          prefersReducedMotion,
          motion.navigation.detailPush,
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Home' }} />
    </Stack>
  );
}
