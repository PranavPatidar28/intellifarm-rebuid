import { Stack } from 'expo-router';

import { motion, resolveMotionAnimation, useReducedMotionPreference } from '@/theme/motion';

export default function MarketStackLayout() {
  const prefersReducedMotion = useReducedMotionPreference();
  const detailAnimation = resolveMotionAnimation(
    prefersReducedMotion,
    motion.navigation.detailPush,
  );

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        animation: detailAnimation,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Market' }} />
      <Stack.Screen
        name="crop/[cropName]"
        options={{ title: 'Crop detail', animation: detailAnimation }}
      />
      <Stack.Screen
        name="mandi/[mandiKey]"
        options={{ title: 'Mandi detail', animation: detailAnimation }}
      />
    </Stack>
  );
}
