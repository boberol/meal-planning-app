import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Txt } from '@/components/Txt';
import { colors, fonts, radius } from '@/constants/theme';
import { formatWeekRange, weekDays } from '@/lib/dates';

/** The Plan tab: this week's meals. The planner itself arrives in Step 2. */
export default function PlanScreen() {
  const today = new Date();
  const days = weekDays(today);

  return (
    <Screen>
      <ScreenHeader eyebrow={formatWeekRange(today)} title="This week" />

      <View style={styles.days} accessibilityLabel="Days of this week">
        {days.map((d) => (
          <View key={d.label} style={[styles.day, d.isToday && styles.today]} accessibilityLabel={`${d.label} ${d.day}${d.isToday ? ', today' : ''}`}>
            <Txt style={[styles.dayLabel, d.isToday && styles.todayText]}>{d.label}</Txt>
            <Txt style={[styles.dayNumber, d.isToday && styles.todayText]}>{d.day}</Txt>
          </View>
        ))}
      </View>

      <EmptyState
        icon="calendar-outline"
        title="No meals planned yet"
        body="Adding recipes and planning the week comes in the next update. Until then, invite your family so everyone is ready.">
        <Button title="Invite your family" onPress={() => router.push('/household')} />
      </EmptyState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    height: 64,
    borderRadius: radius.lg - 4,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  today: { backgroundColor: colors.ink },
  dayLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  dayNumber: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  todayText: { color: colors.onAccent },
});
