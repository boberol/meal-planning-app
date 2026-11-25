import { StyleSheet, View } from 'react-native';

import { colors, fonts, radius, space } from '@/constants/theme';

import { IconButton } from './IconButton';
import { Txt } from './Txt';

/** "Servings  –  4  +" in a white card. */
export function Stepper({ label, value, onChange, min = 1, max = 50 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <View style={styles.card} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') onChange(Math.min(max, value + 1));
        if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(min, value - 1));
      }}>
      <Txt variant="bodyStrong">{label}</Txt>
      <View style={styles.controls}>
        <IconButton icon="remove" label={`Fewer ${label.toLowerCase()}`} onPress={() => onChange(Math.max(min, value - 1))} disabled={value <= min} style={styles.button} />
        <Txt style={styles.value} accessibilityLiveRegion="polite">
          {value}
        </Txt>
        <IconButton icon="add" label={`More ${label.toLowerCase()}`} onPress={() => onChange(Math.min(max, value + 1))} disabled={value >= max} style={styles.button} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: space.sm,
    paddingLeft: space.lg,
    paddingRight: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controls: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  button: { backgroundColor: colors.ground },
  value: { minWidth: 40, textAlign: 'center', fontFamily: fonts.heading, fontSize: 18 },
});
