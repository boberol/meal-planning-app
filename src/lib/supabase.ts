/**
 * The connection to Supabase, our online database.
 *
 * The two values come from environment variables in `.env.local`
 * (see docs/SETUP.md). Anything starting with EXPO_PUBLIC_ is built into
 * the app, which is fine here: the publishable key is meant to be public,
 * and the database's Row Level Security rules decide what each person can see.
 */
import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/** False until `.env.local` has both values. The app shows setup help instead of crashing. */
export const isSupabaseConfigured = Boolean(url && key);

export const supabase = createClient(url ?? 'https://not-configured.supabase.co', key ?? 'not-configured', {
  auth: {
    // Keep people signed in between app launches. The session is saved on the
    // phone through expo-sqlite's localStorage.
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    // Only websites receive sign-in links in the URL; a phone app doesn't.
    detectSessionInUrl: false,
  },
});

// On a phone, refresh the sign-in token only while the app is open.
// This is Supabase's recommended setup for React Native.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
