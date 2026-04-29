import { Stack } from 'expo-router';

export default function VoiceStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Assistant' }} />
    </Stack>
  );
}
