import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { colors, fonts, radius, space } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { createHousehold, formatInviteCode, joinHousehold } from '@/lib/household';

/**
 * Shown once, right after signing up: start a new household, or join
 * your family's with the code they shared.
 */
export default function Onboarding() {
  const { profile, refreshProfile, signOut } = useAuth();
  const firstName = profile?.display_name.split(' ')[0] ?? '';

  const [householdName, setHouseholdName] = useState('');
  const [code, setCode] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);

  async function create() {
    if (!householdName.trim()) {
      setCreateError('Give your household a name, like “Our home”.');
      return;
    }
    setBusy('create');
    setCreateError(null);
    try {
      await createHousehold(householdName);
      // Reloading the profile picks up the new household, and the app
      // switches to the tabs by itself.
      await refreshProfile();
    } catch (e) {
      setCreateError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function join() {
    if (!code.trim()) {
      setJoinError('Type the code your family shared with you.');
      return;
    }
    setBusy('join');
    setJoinError(null);
    try {
      await joinHousehold(code);
      await refreshProfile();
    } catch (e) {
      setJoinError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen keyboard>
      <View style={styles.heading}>
        <Txt variant="eyebrow">{firstName ? `Hi ${firstName}` : 'Welcome'}</Txt>
        <Txt variant="title">Set up your household</Txt>
        <Txt variant="caption">
          A household shares one set of recipes, one meal plan, one pantry and one grocery list.
        </Txt>
      </View>

      <View style={styles.card}>
        <Txt variant="heading">Join your family</Txt>
        <Txt variant="caption">Someone already set it up? Ask them for the invite code on their Household screen.</Txt>
        <TextField
          label="Invite code"
          value={code}
          onChangeText={(t) => setCode(formatInviteCode(t))}
          placeholder="PLUM-4821"
          error={joinError}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={join}
          style={styles.codeInput}
        />
        <Button title="Join household" onPress={join} loading={busy === 'join'} disabled={busy === 'create'} />
      </View>

      <View style={styles.or} importantForAccessibility="no-hide-descendants">
        <View style={styles.rule} />
        <Txt variant="caption">or</Txt>
        <View style={styles.rule} />
      </View>

      <View style={styles.card}>
        <Txt variant="heading">Start a new household</Txt>
        <Txt variant="caption">You’ll get a code to invite everyone else.</Txt>
        <TextField
          label="Household name"
          value={householdName}
          onChangeText={setHouseholdName}
          placeholder="Our home"
          error={createError}
          autoCapitalize="sentences"
          maxLength={60}
          returnKeyType="go"
          onSubmitEditing={create}
        />
        <Button title="Create household" variant="secondary" onPress={create} loading={busy === 'create'} disabled={busy === 'join'} />
      </View>

      <Pressable accessibilityRole="button" onPress={() => signOut()} style={styles.signOut}>
        <Txt style={styles.signOutText}>Not you? Sign out</Txt>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 6, marginTop: space.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  codeInput: { fontFamily: fonts.heading, fontSize: 20, letterSpacing: 2 },
  or: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rule: { flex: 1, height: 1, backgroundColor: colors.divider },
  signOut: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
  signOutText: { fontFamily: fonts.semibold, color: colors.muted, fontSize: 14 },
});
