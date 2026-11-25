import { forwardRef, useState, type ComponentRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, radius } from '@/constants/theme';

import { Txt } from './Txt';

/** What `useRef` should hold for a TextField, so you can call `.focus()`. */
export type TextFieldRef = ComponentRef<typeof TextInput>;

type Props = TextInputProps & {
  label: string;
  error?: string | null;
  hint?: string;
};

/**
 * A text input with a visible label above it and its error message below it.
 */
export const TextField = forwardRef<TextFieldRef, Props>(function TextField({ label, error, hint, style, onFocus, onBlur, ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Txt variant="label">{label}</Txt>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.subtle}
        style={[styles.input, focused && styles.focused, error ? styles.invalid : null, style]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        maxFontSizeMultiplier={1.4}
        {...rest}
      />
      {error ? (
        <Txt variant="caption" color={colors.warn} accessibilityLiveRegion="polite">
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="caption">{hint}</Txt>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.field,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
  },
  focused: { borderColor: colors.accent, borderWidth: 1.5 },
  invalid: { borderColor: colors.warn, borderWidth: 1.5 },
});
