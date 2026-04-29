import { Stack } from 'expo-router';

export default function MarketStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Market' }} />
      <Stack.Screen name="crop/[cropName]" options={{ title: 'Crop detail' }} />
      <Stack.Screen name="mandi/[mandiKey]" options={{ title: 'Mandi detail' }} />
    </Stack>
  );
}
