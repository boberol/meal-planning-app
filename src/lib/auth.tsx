/**
 * Who is signed in, and which household they belong to.
 *
 * <AuthProvider> wraps the whole app (see src/app/_layout.tsx). Any screen can
 * call useAuth() to read the signed-in person's profile or to sign in and out.
 */
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { friendlyError } from './errors';
import { isSupabaseConfigured, supabase } from './supabase';
import type { ProfileWithHousehold } from './types';

type AuthState = {
  /** `undefined` while we're still checking for a saved session on launch. */
  session: Session | null | undefined;
  /** The signed-in person's profile, or `null` if signed out or not loaded yet. */
  profile: ProfileWithHousehold | null;
  /** True until we know both the session and (if signed in) the profile. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Returns `needsConfirmation: true` when Supabase is set to require email confirmation. */
  signUp: (name: string, email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  /** Reload the profile, for example after joining a household. */
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function loadProfile(userId: string): Promise<ProfileWithHousehold | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, color, household_id, joined_household_at, household:households(*)')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ProfileWithHousehold | null) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(isSupabaseConfigured ? undefined : null);
  const [profile, setProfile] = useState<ProfileWithHousehold | null>(null);
  // The user id whose profile we last finished loading (successfully or not).
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // 1. On launch, read any saved session, then listen for sign-in and sign-out.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    try {
      setProfile(await loadProfile(userId));
    } catch (e) {
      console.warn('Could not load profile', e);
    } finally {
      setLoadedFor(userId);
    }
  }, [userId]);

  // 2. Whenever the signed-in person changes, load their profile.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    loadProfile(userId)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((e) => {
        console.warn('Could not load profile', e);
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setLoadedFor(userId);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 3. Keep the profile live: if the owner removes you from the household,
  //    or someone renames it, this screen updates on its own.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`profile-${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, () => {
        refreshProfile();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refreshProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(friendlyError(error));
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // The database copies display_name into the new profile (see the migration).
      options: { data: { display_name: name.trim() } },
    });
    if (error) throw new Error(friendlyError(error));
    return { needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(friendlyError(error));
  }, []);

  const loading = session === undefined || (Boolean(userId) && loadedFor !== userId);
  // Only hand out the profile that belongs to whoever is signed in right now.
  const currentProfile = userId && profile?.id === userId ? profile : null;

  const value = useMemo<AuthState>(
    () => ({ session, profile: currentProfile, loading, signIn, signUp, signOut, refreshProfile }),
    [session, currentProfile, loading, signIn, signUp, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
