import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, radius } from '@/constants/theme';

/** The dark floating button at the bottom right, for the screen's main "add" action. */
export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
      <Ionicons name="add" size={22} color={colors.onAccent} />
      <Text style={styles.text} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    height: 56,
    paddingLeft: 18,
    paddingRight: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: colors.ink,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  pressed: { transform: [{ scale: 0.97 }] },
  text: { fontFamily: fonts.semibold, fontSize: 15, color: colors.onAccent },
});
