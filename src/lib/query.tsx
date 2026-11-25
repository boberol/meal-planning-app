/**
 * Data loading and caching.
 *
 * We use TanStack Query: each screen asks for data by a "key" such as
 * ['recipes', householdId]. The first screen that asks loads it from Supabase;
 * other screens reuse the copy in memory. When something changes (you save a
 * recipe, or another family member does), we "invalidate" the key and every
 * screen showing it reloads on its own.
 */
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data counts as fresh for 30 seconds. Live updates keep it current
        // in between, so this mostly avoids reloading when you switch tabs.
        staleTime: 30_000,
        retry: 1,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);

  // When the app comes back to the front, reload anything that's out of date,
  // in case a change arrived while the phone was asleep.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
    return () => sub.remove();
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** The keys our screens use, in one place so they always match. */
export const keys = {
  recipes: (householdId: string) => ['recipes', householdId] as const,
  recipe: (id: string) => ['recipe', id] as const,
  plan: (householdId: string, monday: string) => ['plan', householdId, monday] as const,
  planAll: (householdId: string) => ['plan', householdId] as const,
  meal: (id: string) => ['meal', id] as const,
  members: (householdId: string) => ['members', householdId] as const,
  ingredientSearch: (query: string) => ['ingredient-search', query] as const,
};

/**
 * Pull-to-refresh that only spins when you pulled, not when a live update
 * reloads the data in the background.
 */
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  function onRefresh() {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }
  return { refreshing, onRefresh };
}
