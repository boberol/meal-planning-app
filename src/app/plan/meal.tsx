/**
 * Add a meal to the plan, or change one.
 *
 * /plan/meal?date=2026-11-25&slot=dinner   a new meal for that day and slot
 * /plan/meal?recipeId=…&servings=4          a new meal from a recipe page
 * /plan/meal?id=…                           change, move or remove a planned meal
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { ModalHeader } from '@/components/ModalHeader';
import { RecipeTile } from '@/components/RecipeTile';
import { SearchField } from '@/components/SearchField';
import { Stepper } from '@/components/Stepper';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { WeekStrip } from '@/components/WeekStrip';
import { colors, fonts, radius, space } from '@/constants/theme';
import { addDays, formatWeekRange, fromISODate, toISODate } from '@/lib/dates';
import { addMeal, deleteMeal, fetchMeal, SLOTS, updateMeal, type MealEntry, type MealSlot } from '@/lib/mealPlan';
import { keys } from '@/lib/query';
import { fetchRecipes, formatMinutes, totalMinutes } from '@/lib/recipes';
import { useHousehold } from '@/lib/useHousehold';

type Params = { id?: string; date?: string; slot?: string; recipeId?: string; servings?: string };

export default function MealScreen() {
  const params = useLocalSearchParams<Params>();
  const { data, isPending, error, refetch } = useQuery({
    queryKey: keys.meal(params.id ?? ''),
    queryFn: () => fetchMeal(params.id as string),
    enabled: Boolean(params.id),
  });

  if (params.id && (isPending || error || !data)) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.loadingHeader}>
          <Button title="Close" variant="quiet" onPress={() => router.back()} />
        </View>
        <View style={styles.message}>
          {isPending ? (
            <ActivityIndicator color={colors.accent} />
          ) : error ? (
            <EmptyState icon="cloud-offline-outline" title="Couldn’t load this meal" body={error.message}>
              <Button title="Try again" onPress={() => refetch()} />
            </EmptyState>
          ) : (
            <EmptyState icon="trash-outline" title="This meal was removed" body="Someone in your household may have taken it off the plan." />
          )}
        </View>
      </SafeAreaView>
    );
  }

  return <MealForm entry={params.id ? (data ?? null) : null} params={params} />;
}

const SLOT_KEYS = SLOTS.map((s) => s.key);

function MealForm({ entry, params }: { entry: MealEntry | null; params: Params }) {
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const { householdId, userId } = useHousehold();

  const [mode, setMode] = useState<'recipe' | 'text'>(entry && !entry.recipe_id ? 'text' : 'recipe');
  const [recipeId, setRecipeId] = useState<string | null>(entry?.recipe_id ?? params.recipeId ?? null);
  const [text, setText] = useState(entry?.free_text ?? '');
  const [date, setDate] = useState(() => fromISODate(entry?.date ?? params.date ?? toISODate(new Date())));
  const [slot, setSlot] = useState<MealSlot>(entry?.slot ?? (SLOT_KEYS.includes(params.slot as MealSlot) ? (params.slot as MealSlot) : 'dinner'));
  const [servings, setServings] = useState<number | null>(entry?.servings ?? (params.servings ? Number(params.servings) || null : null));
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const { data: recipes = [], isPending: recipesLoading } = useQuery({
    queryKey: keys.recipes(householdId),
    queryFn: () => fetchRecipes(householdId),
  });
  const chosen = recipes.find((r) => r.id === recipeId) ?? null;
  // Until you change it, servings follow the chosen recipe.
  const shownServings = servings ?? chosen?.servings ?? 4;

  const q = search.trim().toLowerCase();
  const listed = [...recipes]
    .filter((r) => !q || r.name.toLowerCase().includes(q) || r.ingredientNames.some((n) => n.includes(q)))
    .sort((a, b) => Number(b.id === recipeId) - Number(a.id === recipeId) || Number(b.is_favourite) - Number(a.is_favourite) || a.name.localeCompare(b.name));

  async function save() {
    if (mode === 'recipe' && !recipeId) {
      Alert.alert('Pick a recipe', 'Choose one of your recipes, or switch to “Something else” to type what’s planned.');
      return;
    }
    if (mode === 'text' && !text.trim()) {
      Alert.alert('Say what’s planned', 'For example “Leftovers” or “Eating out”.');
      return;
    }
    setSaving(true);
    try {
      const input = {
        date: toISODate(date),
        slot,
        recipe_id: mode === 'recipe' ? recipeId : null,
        free_text: mode === 'text' ? text.trim() : null,
        servings: mode === 'recipe' ? shownServings : null,
      };
      if (entry) await updateMeal(entry.id, input);
      else await addMeal(householdId, userId, input);
      await client.invalidateQueries({ queryKey: keys.planAll(householdId) });
      if (entry) client.invalidateQueries({ queryKey: keys.meal(entry.id) });
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t save the meal', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!entry) return;
    setRemoving(true);
    try {
      await deleteMeal(entry.id);
      await client.invalidateQueries({ queryKey: keys.planAll(householdId) });
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t remove the meal', (e as Error).message);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <SafeAreaView style={styles.page} edges={['top', 'left', 'right']}>
      <ModalHeader title={entry ? 'Change meal' : 'Add a meal'} onCancel={() => router.back()} onSave={save} saving={saving} saveLabel={entry ? 'Save' : 'Add'} />

      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl * 2 }]} keyboardShouldPersistTaps="handled">
          {/* When */}
          <View style={styles.group}>
            <View style={styles.weekRow}>
              <Txt variant="label">Day</Txt>
              <View style={styles.weekNav}>
                <IconButton icon="chevron-back" label="Previous week" look="bare" onPress={() => setDate(addDays(date, -7))} />
                <Txt variant="caption" style={styles.weekText}>
                  {formatWeekRange(date)}
                </Txt>
                <IconButton icon="chevron-forward" label="Next week" look="bare" onPress={() => setDate(addDays(date, 7))} />
              </View>
            </View>
            <WeekStrip week={date} selected={date} onSelect={setDate} />
          </View>

          <View style={styles.group}>
            <Txt variant="label">Meal</Txt>
            <View style={styles.wrapRow}>
              {SLOTS.map((s) => (
                <Chip key={s.key} label={s.label} selected={slot === s.key} onPress={() => setSlot(s.key)} />
              ))}
            </View>
          </View>

          {/* What */}
          <View style={styles.group}>
            <Txt variant="label">What’s planned</Txt>
            <View style={styles.segment} accessibilityRole="tablist">
              {(
                [
                  ['recipe', 'From your recipes'],
                  ['text', 'Something else'],
                ] as const
              ).map(([key, label]) => (
                <Pressable
                  key={key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: mode === key }}
                  onPress={() => setMode(key)}
                  style={[styles.segmentItem, mode === key && styles.segmentOn]}>
                  <Txt style={[styles.segmentText, mode === key && styles.segmentTextOn]}>{label}</Txt>
                </Pressable>
              ))}
            </View>
          </View>

          {mode === 'text' ? (
            <TextField label="Meal" value={text} onChangeText={setText} placeholder="Leftovers, eating out, pizza night…" maxLength={120} autoCapitalize="sentences" />
          ) : recipesLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : recipes.length === 0 ? (
            <View style={styles.noRecipes}>
              <Txt variant="caption">There are no recipes yet. Add one, or switch to “Something else”.</Txt>
              <Button title="Add a recipe" variant="secondary" onPress={() => router.push('/recipe/edit')} />
            </View>
          ) : (
            <View style={styles.group}>
              {recipes.length > 5 ? <SearchField value={search} onChangeText={setSearch} placeholder="Search recipes" label="Search recipes" /> : null}
              <View style={styles.list}>
                {listed.map((r, i) => {
                  const isChosen = r.id === recipeId;
                  const time = formatMinutes(totalMinutes(r));
                  return (
                    <Pressable
                      key={r.id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isChosen }}
                      accessibilityLabel={[r.name, time].filter(Boolean).join(', ')}
                      onPress={() => {
                        setRecipeId(r.id);
                        if (!entry && !params.servings) setServings(null);
                      }}
                      style={({ pressed }) => [styles.row, i < listed.length - 1 && styles.rowDivider, isChosen && styles.rowOn, pressed && styles.rowPressed]}>
                      <RecipeTile photoUrl={r.photo_url} seed={r.id} iconSize={18} style={styles.rowTile} />
                      <View style={styles.fill}>
                        <Txt variant="bodyStrong" numberOfLines={1}>
                          {r.name}
                        </Txt>
                        {time ? <Txt variant="caption">{time}</Txt> : null}
                      </View>
                      <Ionicons name={isChosen ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={isChosen ? colors.accent : colors.field} />
                    </Pressable>
                  );
                })}
                {listed.length === 0 ? <Txt variant="caption" style={styles.emptySearch}>{`No recipes match “${search.trim()}”.`}</Txt> : null}
              </View>
            </View>
          )}

          {mode === 'recipe' && recipes.length > 0 ? <Stepper label="Servings" value={shownServings} onChange={setServings} /> : null}

          {entry ? <Button title="Remove from plan" variant="danger" onPress={remove} loading={removing} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.ground },
  fill: { flex: 1 },
  loadingHeader: { padding: space.md, alignItems: 'flex-start' },
  message: { flex: 1, justifyContent: 'center', padding: space.xl },
  content: { paddingHorizontal: space.xl, paddingTop: space.sm, gap: space.xl },
  group: { gap: space.sm },
  weekRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekNav: { flexDirection: 'row', alignItems: 'center' },
  weekText: { minWidth: 120, textAlign: 'center' },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  segment: { flexDirection: 'row', backgroundColor: colors.line, borderRadius: radius.pill, padding: 4 },
  segmentItem: { flex: 1, minHeight: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.sm },
  segmentOn: {
    backgroundColor: colors.surface,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
  segmentTextOn: { color: colors.ink },
  noRecipes: { gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg },
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.sm },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  rowOn: { backgroundColor: colors.accentSoft },
  rowPressed: { backgroundColor: colors.ground },
  rowTile: { width: 44, height: 44, borderRadius: radius.sm },
  emptySearch: { padding: space.lg },
});
