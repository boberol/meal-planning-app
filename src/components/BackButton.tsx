import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { colors, TAP_TARGET } from '@/constants/theme';

/** The round back arrow at the top left of pushed screens. */
export function BackButton({ label = 'Back' }: { label?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Ionicons name="chevron-back" size={22} color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: TAP_TARGET,
    height: TAP_TARGET,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.ground, transform: [{ scale: 0.96 }] },
});
