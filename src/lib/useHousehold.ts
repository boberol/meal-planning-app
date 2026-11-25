/**
 * Small hooks that many screens need.
 */
import { useQuery } from '@tanstack/react-query';

import { useAuth } from './auth';
import { fetchMembers } from './household';
import { keys } from './query';

/** The signed-in person's id and household id. Screens behind the household guard always have both. */
export function useHousehold() {
  const { profile, session } = useAuth();
  return { householdId: profile?.household_id ?? '', userId: session?.user.id ?? '' };
}

/** Everyone in the household, and a helper to turn a person's id into a name. */
export function useMembers() {
  const { householdId, userId } = useHousehold();
  const query = useQuery({
    queryKey: keys.members(householdId),
    queryFn: () => fetchMembers(householdId),
    enabled: Boolean(householdId),
    staleTime: 5 * 60_000,
  });
  function nameOf(id: string | null | undefined): string | null {
    if (!id) return null;
    if (id === userId) return 'you';
    return query.data?.find((m) => m.id === id)?.display_name || null;
  }
  return { members: query.data ?? [], nameOf };
}
