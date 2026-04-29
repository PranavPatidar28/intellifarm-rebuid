import { Stack } from 'expo-router';

export default function CommunityStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
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
      <Stack.Screen name="post/[id]" options={{ title: 'Community thread' }} />
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
