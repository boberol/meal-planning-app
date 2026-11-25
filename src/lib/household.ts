/**
 * Everything to do with households: creating one, joining with a code,
 * listing members, and the owner's controls.
 *
 * Most of these call database functions (supabase/migrations) rather than
 * writing to tables directly. That keeps the rules in one safe place: for
 * example, only the database can put you into a household, and only after
 * checking the invite code.
 */
import { friendlyError } from './errors';
import { supabase } from './supabase';
import type { Household, Profile } from './types';

async function callRpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(friendlyError(error));
  return data as T;
}

export function createHousehold(name: string) {
  return callRpc<Household>('create_household', { p_name: name.trim() });
}

/** Codes look like PLUM-4821. Spaces and lower case are fine; the database tidies them. */
export function joinHousehold(code: string) {
  return callRpc<Household>('join_household', { p_code: code });
}

export function regenerateInviteCode() {
  return callRpc<Household>('regenerate_invite_code');
}

export function leaveHousehold() {
  return callRpc<void>('leave_household');
}

export function removeMember(memberId: string) {
  return callRpc<void>('remove_member', { p_member: memberId });
}

export async function fetchMembers(householdId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, color, household_id, joined_household_at')
    .eq('household_id', householdId)
    .order('joined_household_at', { ascending: true });
  if (error) throw new Error(friendlyError(error));
  return data ?? [];
}

/** "PLUM-4821" → "PLUM-4821"; "plum 4821" → "PLUM-4821". Used to tidy what people type. */
export function formatInviteCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const letters = cleaned.match(/^[A-Z]+/)?.[0] ?? '';
  const digits = cleaned.slice(letters.length);
  return digits ? `${letters}-${digits}` : letters;
}

/** Whole days until the invite code stops working, never below 0. */
export function daysUntil(isoDate: string | null, now: Date = new Date()): number {
  if (!isoDate) return 0;
  const ms = new Date(isoDate).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}
