/**
 * Design tokens: the colours, sizes and fonts used everywhere in the app.
 *
 * They match the screen designs. Change a value here and every screen
 * that uses it updates, so never hard-code a colour in a screen.
 */

export const colors = {
  /** Page background behind cards. */
  ground: '#F4F6F3',
  /** Cards, inputs and the tab bar. */
  surface: '#FFFFFF',
  /** Main text. */
  ink: '#142019',
  /** Secondary text: dates, hints, meta lines. Passes 4.5:1 on ground and surface. */
  muted: '#56635A',
  /** Placeholder text and done/ticked items. */
  subtle: '#6B776F',
  /** Borders on inputs and outline buttons. */
  field: '#DDE3DC',
  /** Hairlines between list rows. */
  line: '#EEF1ED',
  /** The tab bar's top border. */
  divider: '#E1E6E0',

  /** Brand green: primary buttons, active tab, links. White text on it passes 4.5:1. */
  accent: '#1E6F47',
  accentPressed: '#16573A',
  /** Soft green fill for "Have" and "All in pantry" badges. */
  accentSoft: '#E3F0E8',
  /** Green text on accentSoft. */
  accentInk: '#17603C',

  /** Orange-brown for "Missing" and "Use soon". Always paired with a word, never colour alone. */
  warn: '#B4430E',
  warnSoft: '#FCEBDD',
  warnInk: '#8A3108',

  /** Destructive text, such as Sign out or Remove. */
  danger: '#9A3A0B',

  onAccent: '#FFFFFF',
  /** The dark household card. */
  night: '#142019',
  nightMuted: '#B8C7BD',
} as const;

/** Colours people can pick for their avatar. All pass 4.5:1 with white text. */
export const avatarColors = ['#1E6F47', '#C2410C', '#2F5D8A', '#8A5A12', '#9D2F55', '#3F4A43'] as const;

/** Soft background and icon colours for recipes that don't have a photo yet. */
export const tileTints = [
  { bg: '#F6DCD2', fg: '#A85E45' },
  { bg: '#EFE6C8', fg: '#86733F' },
  { bg: '#DCEBDF', fg: '#2F6B48' },
  { bg: '#DCE6EF', fg: '#3F5F7D' },
  { bg: '#E9E1D6', fg: '#7A6345' },
] as const;

export const radius = {
  sm: 12,
  md: 14,
  lg: 20,
  xl: 24,
  sheet: 28,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

/**
 * Font family names as loaded in src/app/_layout.tsx.
 * Inter for reading, Plus Jakarta Sans for headings.
 */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  heading: 'PlusJakartaSans_700Bold',
  headingHeavy: 'PlusJakartaSans_800ExtraBold',
} as const;

/** Minimum size for anything you can tap, from accessibility guidelines. */
export const TAP_TARGET = 44;
