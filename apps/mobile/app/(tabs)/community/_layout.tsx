import { Stack } from 'expo-router';

import { motion, resolveMotionAnimation, useReducedMotionPreference } from '@/theme/motion';

export default function CommunityStackLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Community' }} />
      <Stack.Screen
        name="new"
        options={{
          title: 'Ask community',
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.88, 1.0],
        }}
      />
      <Stack.Screen
        name="post/[id]"
        options={{ title: 'Community thread', animation: detailAnimation }}
      />
      <Stack.Screen
        name="report"
        options={{
          title: 'Report content',
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.74, 1.0],
        }}
      />
    </Stack>
  );
}
