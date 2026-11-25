import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

/** The signed-out screens: welcome, sign up and sign in. */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}>
      {/* Listed first, so it's where signed-out people land. */}
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="sign-in" />
    </Stack>
  );
}
