import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableFreeze } from 'react-native-screens';
import 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import {
  NotoSans_400Regular,
  NotoSans_500Medium,
  NotoSans_700Bold,
} from '@expo-google-fonts/noto-sans';
import {
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_500Medium,
} from '@expo-google-fonts/noto-sans-devanagari';
import { Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';

import { LoadingScreen } from '@/components/loading-screen';
import { PendingUploadSync } from '@/components/pending-upload-sync';
import { AppProviders, useSession } from '@/features/session/session-provider';
import { motion, resolveMotionAnimation, useReducedMotionPreference } from '@/theme/motion';
import { palette } from '@/theme/tokens';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
enableFreeze(true);

export default function RootLayout() {
  const [loaded, error] = useFonts({
    NotoSans_400Regular,
    NotoSans_500Medium,
    NotoSans_700Bold,
    NotoSansDevanagari_400Regular,
    NotoSansDevanagari_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      void SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return <LoadingScreen label="Loading IntelliFarm" />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.parchment }}>
      <AppProviders>
        <StatusBar style="dark" />
        <PendingUploadSync />
        <RootLayoutNav />
      </AppProviders>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const { bootstrapped } = useSession();
  const prefersReducedMotion = useReducedMotionPreference();
  const detailAnimation = resolveMotionAnimation(
    prefersReducedMotion,
    motion.navigation.detailPush,
  );
  const fadeAnimation = resolveMotionAnimation(
    prefersReducedMotion,
    motion.navigation.fade,
  );

  if (!bootstrapped) {
    return <LoadingScreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.parchment },
        freezeOnBlur: true,
      }}
    >
      <Stack.Screen
        name="(auth)"
        options={{ headerShown: false, animation: fadeAnimation }}
      />
      <Stack.Screen
        name="(onboarding)"
        options={{ headerShown: false, animation: fadeAnimation }}
      />
      <Stack.Screen
        name="(tabs)"
        options={{ headerShown: false, animation: detailAnimation }}
      />
      <Stack.Screen
        name="alerts"
        options={{ presentation: 'card', animation: detailAnimation }}
      />
      <Stack.Screen
        name="schemes"
        options={{ presentation: 'card', animation: detailAnimation }}
      />
      <Stack.Screen
        name="scheme/[id]"
        options={{ presentation: 'card', animation: detailAnimation }}
      />
      <Stack.Screen
        name="profile-settings"
        options={{ presentation: 'card', animation: detailAnimation }}
      />
      <Stack.Screen
        name="profile-settings-edit"
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.76, 1.0],
        }}
      />
      <Stack.Screen
        name="expenses/add"
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.78, 1.0],
        }}
      />
      <Stack.Screen
        name="expenses/edit/[id]"
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.78, 1.0],
        }}
      />
      <Stack.Screen
        name="expenses/budget"
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.62, 0.92],
        }}
      />
      <Stack.Screen
        name="expenses/report"
        options={{ presentation: 'card', animation: detailAnimation }}
      />
      <Stack.Screen
        name="facilities"
        options={{ presentation: 'card', animation: detailAnimation }}
      />
      <Stack.Screen
        name="sell-store"
        options={{ presentation: 'card', animation: detailAnimation }}
      />
      <Stack.Screen
        name="expert-help"
        options={{ presentation: 'card', animation: detailAnimation }}
      />
      <Stack.Screen
        name="offline"
        options={{ presentation: 'card', animation: detailAnimation }}
      />
      <Stack.Screen
        name="crop-prediction"
        options={{ presentation: 'card', animation: detailAnimation }}
      />
      <Stack.Screen
        name="personal-tasks"
        options={{ presentation: 'card', animation: detailAnimation }}
      />
      <Stack.Screen
        name="personal-task/[id]"
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.62, 0.92],
        }}
      />
      <Stack.Screen
        name="season/[id]"
        options={{ presentation: 'card', animation: detailAnimation }}
      />
      <Stack.Screen
        name="task/[id]"
        options={{ presentation: 'card', animation: detailAnimation }}
      />
      <Stack.Screen
        name="weather/[farmPlotId]"
        options={{ presentation: 'card', animation: detailAnimation }}
      />
      <Stack.Screen
        name="disease-report/[id]"
        options={{ presentation: 'card', animation: detailAnimation }}
      />
    </Stack>
  );
}
