/**
 * The root of the app. Every screen is inside this.
 *
 * It does three things:
 * 1. Loads the fonts and keeps the splash screen up until they're ready.
 * 2. Wraps everything in <AuthProvider> so screens know who is signed in.
 * 3. Decides which part of the app you can see:
 *    - signed out → the welcome and sign-in screens, (auth)
 *    - signed in, no household yet → onboarding (create or join one)
 *    - signed in with a household → the five tabs, (tabs), and Household
 *    `Stack.Protected` does the redirecting: when `guard` is false those
 *    screens are hidden and you're sent to one you're allowed to see.
 */
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { SetupNeeded } from '@/components/SetupNeeded';
import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      {/* If a font fails to load we carry on with the system font rather than hang. */}
      <RootNavigator fontsReady={fontsLoaded || Boolean(fontError)} />
    </AuthProvider>
  );
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { session, profile, loading } = useAuth();
  const ready = fontsReady && !loading;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  if (!isSupabaseConfigured) return <SetupNeeded />;

  const signedIn = Boolean(session);
  const hasHousehold = Boolean(profile?.household_id);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && !hasHousehold}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && hasHousehold}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="household" />
      </Stack.Protected>
    </Stack>
  );
}
