import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField, type TextFieldRef } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { colors, fonts, radius, space } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<TextFieldRef>(null);

  async function submit() {
    setNotice(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      // Signed in: the app moves on by itself.
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Type your email above first, then tap “Forgot password?” again.');
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (resetError) setError(friendlyError(resetError));
    else setNotice(`We sent a password reset link to ${email.trim()}.`);
  }

  return (
    <Screen keyboard>
      <BackButton />
      <Txt variant="title" style={styles.title}>
        Welcome back
      </Txt>

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Pressable accessibilityRole="button" onPress={forgotPassword} style={styles.forgot}>
        <Txt style={styles.forgotText}>Forgot password?</Txt>
      </Pressable>

      {error ? (
        <View style={[styles.banner, styles.bannerError]} accessibilityLiveRegion="polite">
          <Txt color={colors.warnInk}>{error}</Txt>
        </View>
      ) : null}
      {notice ? (
        <View style={[styles.banner, styles.bannerOk]} accessibilityLiveRegion="polite">
          <Txt color={colors.accentInk}>{notice}</Txt>
        </View>
      ) : null}

      <Button title="Sign in" onPress={submit} loading={busy} />

      <View style={styles.switch}>
        <Txt variant="caption">New here?</Txt>
        <Link href="/sign-up" replace style={styles.link}>
          Create an account
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.sm },
  forgot: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  forgotText: { fontFamily: fonts.semibold, color: colors.accent, fontSize: 14 },
  banner: { borderRadius: radius.md, padding: space.md },
  bannerError: { backgroundColor: colors.warnSoft },
  bannerOk: { backgroundColor: colors.accentSoft },
  switch: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  link: { color: colors.accent, fontWeight: '600', fontSize: 14, paddingVertical: 12 },
});
