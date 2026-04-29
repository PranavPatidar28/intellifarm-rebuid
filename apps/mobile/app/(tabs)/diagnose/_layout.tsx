import { Stack } from 'expo-router';

export default function DiagnoseStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Diagnose' }} />
    </Stack>
  );
}
