/**
 * Reading and changing the household's meal plan.
 */
import { addDays, toISODate } from './dates';
import { friendlyError } from './errors';
import { supabase } from './supabase';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const SLOTS: { key: MealSlot; label: string; add: string }[] = [
  { key: 'breakfast', label: 'Breakfast', add: 'Add breakfast' },
  { key: 'lunch', label: 'Lunch', add: 'Add lunch' },
  { key: 'dinner', label: 'Dinner', add: 'Add dinner' },
  { key: 'snack', label: 'Snack', add: 'Add a snack' },
];

export type MealEntry = {
  id: string;
  date: string; // "2026-11-25"
  slot: MealSlot;
  recipe_id: string | null;
  free_text: string | null;
  servings: number | null;
  added_by: string | null;
  created_at: string;
  recipe: { id: string; name: string; photo_url: string | null; servings: number } | null;
};

export type MealInput = {
  date: string;
  slot: MealSlot;
  recipe_id: string | null;
  free_text: string | null;
  servings: number | null;
};

const COLUMNS = 'id, date, slot, recipe_id, free_text, servings, added_by, created_at, recipe:recipes(id, name, photo_url, servings)';

/** Every meal in the week that starts on `monday`. */
export async function fetchWeek(householdId: string, monday: Date): Promise<MealEntry[]> {
  const { data, error } = await supabase
    .from('meal_plan_entries')
    .select(COLUMNS)
    .eq('household_id', householdId)
    .gte('date', toISODate(monday))
    .lt('date', toISODate(addDays(monday, 7)))
    .order('created_at', { ascending: true });
  if (error) throw new Error(friendlyError(error));
  return (data ?? []) as unknown as MealEntry[];
}

export async function fetchMeal(id: string): Promise<MealEntry | null> {
  const { data, error } = await supabase.from('meal_plan_entries').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error(friendlyError(error));
  return (data as unknown as MealEntry | null) ?? null;
}

export async function addMeal(householdId: string, userId: string, input: MealInput): Promise<void> {
  const { error } = await supabase.from('meal_plan_entries').insert({ ...input, household_id: householdId, added_by: userId });
  if (error) throw new Error(friendlyError(error));
}

export async function updateMeal(id: string, input: MealInput): Promise<void> {
  const { error } = await supabase.from('meal_plan_entries').update(input).eq('id', id);
  if (error) throw new Error(friendlyError(error));
}

export async function deleteMeal(id: string): Promise<void> {
  const { error } = await supabase.from('meal_plan_entries').delete().eq('id', id);
  if (error) throw new Error(friendlyError(error));
}

/** Copies last week's meals into the week starting `monday`. Returns how many were copied. */
export async function copyPreviousWeek(monday: Date): Promise<number> {
  const { data, error } = await supabase.rpc('copy_meal_plan_week', {
    p_from_monday: toISODate(addDays(monday, -7)),
    p_to_monday: toISODate(monday),
  });
  if (error) throw new Error(friendlyError(error));
  return (data as number) ?? 0;
}
