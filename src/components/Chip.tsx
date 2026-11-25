import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, radius } from '@/constants/theme';

/** A small round toggle, for filters and tags. Dark when it's on. */
export function Chip({ label, selected, onPress, accessibilityLabel }: { label: string; selected: boolean; onPress: () => void; accessibilityLabel?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [styles.chip, selected && styles.on, pressed && styles.pressed]}>
      <Text style={[styles.text, selected && styles.onText]} maxFontSizeMultiplier={1.4} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.field,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  on: { backgroundColor: colors.ink, borderColor: colors.ink },
  pressed: { transform: [{ scale: 0.97 }] },
  text: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  onText: { color: colors.onAccent },
});
