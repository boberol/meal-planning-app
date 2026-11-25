import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { RecipeTile } from '@/components/RecipeTile';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Txt } from '@/components/Txt';
import { dayKey, WeekStrip } from '@/components/WeekStrip';
import { colors, fonts, radius, space } from '@/constants/theme';
import { addDays, dayHeading, formatWeekRange, fromISODate, relativeWeekLabel, startOfWeek, toISODate } from '@/lib/dates';
import { copyPreviousWeek, fetchWeek, SLOTS, type MealEntry, type MealSlot } from '@/lib/mealPlan';
import { keys, usePullToRefresh } from '@/lib/query';
import { useHousehold, useMembers } from '@/lib/useHousehold';

/** The Plan tab: the household's meals for the week, one day at a time. */
export default function PlanScreen() {
  const { householdId } = useHousehold();
  const { members, nameOf } = useMembers();
  const client = useQueryClient();
  const [selected, setSelected] = useState(() => fromISODate(toISODate(new Date())));

  const monday = startOfWeek(selected);
  const isThisWeek = toISODate(monday) === toISODate(startOfWeek(new Date()));
  const { data: meals = [], isPending, error, refetch } = useQuery({
    queryKey: keys.plan(householdId, toISODate(monday)),
    queryFn: () => fetchWeek(householdId, monday),
  });
  const pull = usePullToRefresh(refetch);

  const copy = useMutation({
    mutationFn: () => copyPreviousWeek(monday),
    onSuccess: (count) => {
      client.invalidateQueries({ queryKey: keys.planAll(householdId) });
      if (count === 0) Alert.alert('Nothing to copy', 'Last week had no meals, or those meals already have something planned this week.');
    },
    onError: (e) => Alert.alert('Couldn’t copy last week', e.message),
  });

  const selectedISO = toISODate(selected);
  const dayMeals = meals.filter((m) => m.date === selectedISO);
  const marked = [...new Set(meals.map((m) => dayKey(fromISODate(m.date))))];

  function openNew(slot: MealSlot) {
    router.push({ pathname: '/plan/meal', params: { date: selectedISO, slot } });
  }

  return (
    <Screen refreshControl={<RefreshControl {...pull} tintColor={colors.accent} colors={[colors.accent]} />}>
      <ScreenHeader
        eyebrow={formatWeekRange(selected)}
        title={relativeWeekLabel(selected)}
        actions={
          <>
            <IconButton icon="chevron-back" label="Previous week" onPress={() => setSelected(addDays(selected, -7))} />
            <IconButton icon="chevron-forward" label="Next week" onPress={() => setSelected(addDays(selected, 7))} />
          </>
        }
      />

      <WeekStrip week={selected} selected={selected} onSelect={setSelected} marked={marked} />

      <View style={styles.dayHeader}>
        <Txt style={styles.dayTitle} accessibilityRole="header">
          {dayHeading(selected)}
        </Txt>
        {!isThisWeek ? (
          <Pressable accessibilityRole="button" onPress={() => setSelected(fromISODate(toISODate(new Date())))} hitSlop={8} style={styles.todayLink}>
            <Txt style={styles.todayLinkText}>Back to today</Txt>
          </Pressable>
        ) : null}
      </View>

      {isPending ? (
        <ActivityIndicator color={colors.accent} style={styles.loading} />
      ) : error ? (
        <EmptyState icon="cloud-offline-outline" title="Couldn’t load the plan" body={error.message}>
          <Button title="Try again" onPress={() => refetch()} />
        </EmptyState>
      ) : (
        <View style={styles.meals}>
          {SLOTS.map((slot) => {
            const inSlot = dayMeals.filter((m) => m.slot === slot.key);
            if (!inSlot.length) {
              return (
                <Pressable
                  key={slot.key}
                  accessibilityRole="button"
                  onPress={() => openNew(slot.key)}
                  style={({ pressed }) => [styles.addSlot, pressed && styles.pressed]}>
                  <Ionicons name="add" size={18} color={colors.accent} />
                  <Txt style={styles.addSlotText}>{slot.add}</Txt>
                </Pressable>
              );
            }
            return inSlot.map((meal) => <MealCard key={meal.id} meal={meal} addedBy={nameOf(meal.added_by)} />);
          })}
        </View>
      )}

      <View style={styles.footer}>
        <Button
          title="Copy last week’s meals"
          variant="quiet"
          icon={<Ionicons name="copy-outline" size={18} color={colors.ink} />}
          onPress={() => copy.mutate()}
          loading={copy.isPending}
          accessibilityHint="Fills this week with last week’s meals, keeping anything already planned"
        />
        {members.length === 1 ? (
          <View style={styles.inviteCard}>
            <Txt variant="bodyStrong">Plan together</Txt>
            <Txt variant="caption">Invite your family so everyone sees the same plan on their phone.</Txt>
            <Button title="Invite your family" variant="secondary" onPress={() => router.push('/household')} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function MealCard({ meal, addedBy }: { meal: MealEntry; addedBy: string | null }) {
  const slotLabel = SLOTS.find((s) => s.key === meal.slot)?.label ?? meal.slot;
  const name = meal.recipe?.name ?? meal.free_text ?? '';
  const servings = meal.servings ?? meal.recipe?.servings;
  const details = meal.recipe
    ? [servings ? `${servings} ${servings === 1 ? 'serving' : 'servings'}` : null, addedBy ? `added by ${addedBy}` : null].filter(Boolean).join(' · ')
    : 'No ingredients needed';

  function open() {
    if (meal.recipe) router.push({ pathname: '/recipe/[id]', params: { id: meal.recipe.id } });
    else router.push({ pathname: '/plan/meal', params: { id: meal.id } });
  }

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${slotLabel}: ${name}. ${details}`}
        accessibilityHint={meal.recipe ? 'Opens the recipe' : 'Change this meal'}
        onPress={open}
        style={({ pressed }) => [styles.cardMain, pressed && styles.pressed]}>
        {meal.recipe ? (
          <RecipeTile photoUrl={meal.recipe.photo_url} seed={meal.recipe.id} style={styles.tile} />
        ) : (
          <View style={[styles.tile, styles.textTile]} importantForAccessibility="no-hide-descendants">
            <Ionicons name="fast-food-outline" size={24} color={colors.muted} />
          </View>
        )}
        <View style={styles.cardText}>
          <Txt variant="overline">{slotLabel}</Txt>
          <Txt variant="bodyStrong" style={styles.mealName} numberOfLines={2}>
            {name}
          </Txt>
          <Txt variant="caption" numberOfLines={1}>
            {details}
          </Txt>
        </View>
      </Pressable>
      <IconButton
        icon="ellipsis-horizontal"
        label={`Change or remove ${name}`}
        look="bare"
        color={colors.muted}
        onPress={() => router.push({ pathname: '/plan/meal', params: { id: meal.id } })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs },
  dayTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.muted },
  todayLink: { minHeight: 32, justifyContent: 'center' },
  todayLinkText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.accent },
  loading: { marginTop: space.xl },
  meals: { gap: space.md, marginTop: -space.xs },
  addSlot: {
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#B9C4BB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  addSlotText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.accent },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, paddingRight: space.xs, flexDirection: 'row', alignItems: 'center' },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  tile: { width: 64, height: 64, borderRadius: radius.md },
  textTile: { backgroundColor: '#E8ECE7', alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, gap: 2 },
  mealName: { fontSize: 16 },
  footer: { gap: space.md, marginTop: space.sm },
  inviteCard: { backgroundColor: colors.accentSoft, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
});
