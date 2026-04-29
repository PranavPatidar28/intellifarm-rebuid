import { Stack } from 'expo-router';

export default function CropPlanStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Crop Plan' }} />
    </Stack>
  );
}
