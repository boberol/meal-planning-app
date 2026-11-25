/**
 * Live sync between family members' phones.
 *
 * Supabase Realtime tells this phone whenever a recipe or a planned meal in
 * your household is added, changed or deleted. We then mark that data as out
 * of date, and any screen showing it reloads on its own (see query.tsx).
 */
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { MealEntry } from './mealPlan';
import { keys } from './query';
import type { RecipeSummary } from './recipes';
import { supabase } from './supabase';

type Change = { new: Record<string, unknown>; old: Record<string, unknown> };

function changedId(change: Change): string | undefined {
  return (change.new?.id ?? change.old?.id) as string | undefined;
}

function recipeChanged(client: QueryClient, householdId: string, id: string | undefined) {
  client.invalidateQueries({ queryKey: keys.recipes(householdId) });
  if (id) client.invalidateQueries({ queryKey: keys.recipe(id) });
  // The plan shows recipe names and photos too.
  client.invalidateQueries({ queryKey: keys.planAll(householdId) });
}

export function useHouseholdSync(householdId: string | null | undefined) {
  const client = useQueryClient();

  useEffect(() => {
    if (!householdId) return;
    const mine = `household_id=eq.${householdId}`;

    const channel = supabase
      .channel(`household-${householdId}`)
      // New and changed rows: the filter means we only hear about our own household.
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'recipes', filter: mine }, (c) =>
        recipeChanged(client, householdId, changedId(c)),
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'recipes', filter: mine }, (c) =>
        recipeChanged(client, householdId, changedId(c)),
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meal_plan_entries', filter: mine }, () =>
        client.invalidateQueries({ queryKey: keys.planAll(householdId) }),
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'meal_plan_entries', filter: mine }, (c) => {
        client.invalidateQueries({ queryKey: keys.planAll(householdId) });
        const id = changedId(c);
        if (id) client.invalidateQueries({ queryKey: keys.meal(id) });
      })
      // Deletes can't be filtered by household (Supabase only sends the deleted
      // row's id), so we check whether the id is one we're showing.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'recipes' }, (c) => {
        const id = changedId(c);
        const list = client.getQueryData<RecipeSummary[]>(keys.recipes(householdId));
        if (id && list?.some((r) => r.id === id)) recipeChanged(client, householdId, id);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'meal_plan_entries' }, (c) => {
        const id = changedId(c);
        const weeks = client.getQueriesData<MealEntry[]>({ queryKey: keys.planAll(householdId) });
        if (id && weeks.some(([, meals]) => meals?.some((m) => m.id === id))) {
          client.invalidateQueries({ queryKey: keys.planAll(householdId) });
          client.invalidateQueries({ queryKey: keys.meal(id) });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [client, householdId]);
}
