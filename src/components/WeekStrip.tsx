import { Pressable, StyleSheet, View } from 'react-native';

import { colors, fonts, radius } from '@/constants/theme';
import { sameDay, weekDays } from '@/lib/dates';

import { Txt } from './Txt';

const LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Seven day buttons, Monday to Sunday. The chosen day is dark; a small dot
 * under a day means something is planned for it.
 */
export function WeekStrip({ week, selected, onSelect, marked = [] }: { week: Date; selected: Date; onSelect: (d: Date) => void; marked?: string[] }) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {weekDays(week).map((d, i) => {
        const isSelected = sameDay(d.date, selected);
        const hasMeals = marked.includes(dayKey(d.date));
        return (
          <Pressable
            key={d.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${LONG[i]} ${d.day}${d.isToday ? ', today' : ''}${hasMeals ? ', has meals' : ''}`}
            onPress={() => onSelect(d.date)}
            style={({ pressed }) => [styles.day, isSelected && styles.selected, pressed && styles.pressed]}>
            <Txt style={[styles.label, d.isToday && styles.todayLabel, isSelected && styles.selectedText]}>{d.label}</Txt>
            <Txt style={[styles.number, isSelected && styles.selectedText]}>{d.day}</Txt>
            <View style={[styles.dot, hasMeals && (isSelected ? styles.dotOnDark : styles.dotOn)]} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** The key WeekStrip's `marked` list uses for a day. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    height: 68,
    borderRadius: radius.lg - 4,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  selected: { backgroundColor: colors.ink },
  pressed: { transform: [{ scale: 0.96 }] },
  label: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.muted },
  todayLabel: { color: colors.accent, fontFamily: fonts.semibold },
  number: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, color: colors.ink },
  selectedText: { color: colors.onAccent },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent' },
  dotOn: { backgroundColor: colors.accent },
  dotOnDark: { backgroundColor: colors.onAccent },
});
