import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, TAP_TARGET } from '@/constants/theme';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  /** What the button does, read out by screen readers ("Edit recipe"). */
  label: string;
  onPress: () => void;
  color?: string;
  /** "raised" floats over photos with a soft shadow; "plain" sits on the page. */
  look?: 'raised' | 'plain' | 'bare';
  disabled?: boolean;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** A round 44 × 44 button with just an icon. */
export function IconButton({ icon, label, onPress, color = colors.ink, look = 'plain', disabled, selected, style }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, styles[look], pressed && styles.pressed, disabled && styles.disabled, style]}>
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { width: TAP_TARGET, height: TAP_TARGET, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  raised: {
    backgroundColor: colors.surface,
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  plain: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.field },
  bare: { backgroundColor: 'transparent' },
  pressed: { transform: [{ scale: 0.95 }], opacity: 0.85 },
  disabled: { opacity: 0.35 },
});
