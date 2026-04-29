import { Stack } from 'expo-router';

export default function MarketStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Market' }} />
    </Stack>
  );
}
