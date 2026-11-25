import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radius, TAP_TARGET } from '@/constants/theme';

/**
 * The app's one button style, in four variants:
 * - primary: green, for the main action on a screen (one per screen)
 * - secondary: green outline, for the second action
 * - quiet: grey outline, for everyday actions
 * - danger: red-brown text, for Sign out or Remove
 *
 * Buttons say what they do as a verb and an object: "Create household", not "OK".
 */
type Variant = 'primary' | 'secondary' | 'quiet' | 'danger';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, variant = 'primary', loading = false, disabled, icon, style, ...rest }: Props) {
  const v = variants[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        v.container,
        pressed && !isDisabled && { backgroundColor: v.pressedBg, transform: [{ scale: 0.98 }] },
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={v.text.color} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.text, v.text]} maxFontSizeMultiplier={1.4}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.pill,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontFamily: fonts.semibold, fontSize: 15 },
  disabled: { opacity: 0.5 },
});

const variants = {
  primary: {
    container: { backgroundColor: colors.accent },
    text: { color: colors.onAccent },
    pressedBg: colors.accentPressed,
  },
  secondary: {
    container: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.accent },
    text: { color: colors.accent },
    pressedBg: colors.accentSoft,
  },
  quiet: {
    container: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.field, minHeight: TAP_TARGET },
    text: { color: colors.ink },
    pressedBg: colors.ground,
  },
  danger: {
    container: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.field },
    text: { color: colors.danger },
    pressedBg: colors.warnSoft,
  },
} as const;
