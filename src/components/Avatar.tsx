import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';

/** A round initial, like "B", in the person's colour. */
export function Avatar({ name, color, size = 36 }: { name: string; color?: string; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.circle, { width: size, height: size, backgroundColor: color ?? colors.accent }]}>
      <Text style={[styles.text, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.semibold, color: colors.onAccent },
});
