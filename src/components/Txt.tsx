import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, fonts } from '@/constants/theme';

/**
 * The app's text styles, so every screen uses the same sizes.
 *
 * - title: the big screen heading ("This week")
 * - heading: a section heading ("Ingredients")
 * - body: normal reading text
 * - label: small bold text above inputs and on buttons
 * - eyebrow: the small grey line above a title ("23 – 29 November")
 * - caption: small grey meta text
 * - overline: SMALL CAPS group labels ("MEMBERS")
 */
type Variant = 'title' | 'heading' | 'body' | 'bodyStrong' | 'label' | 'eyebrow' | 'caption' | 'overline';

type Props = TextProps & { variant?: Variant; color?: string };

export function Txt({ variant = 'body', color, style, ...rest }: Props) {
  return (
    <Text
      style={[styles[variant], color ? { color } : null, style]}
      // Titles and headings are announced as headings by screen readers.
      accessibilityRole={variant === 'title' || variant === 'heading' ? 'header' : undefined}
      maxFontSizeMultiplier={1.6}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.headingHeavy, fontSize: 30, lineHeight: 36, letterSpacing: -0.6, color: colors.ink },
  heading: { fontFamily: fonts.heading, fontSize: 18, lineHeight: 24, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.ink },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22, color: colors.ink },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: '#3F4A43' },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.muted },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  overline: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.muted,
  },
});
