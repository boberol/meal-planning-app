import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField, type TextFieldRef } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { colors, radius, space } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

/**
 * Create an account. After this, the app moves you on to creating or
 * joining a household automatically (see src/app/_layout.tsx).
 */
export default function SignUp() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const emailRef = useRef<TextFieldRef>(null);
  const passwordRef = useRef<TextFieldRef>(null);

  async function submit() {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Add your name so your family knows who planned what.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter an email address, like name@example.com.';
    if (password.length < 6) next.password = 'Use at least 6 characters.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const { needsConfirmation } = await signUp(name, email, password);
      if (needsConfirmation) setCheckEmail(true);
      // Otherwise you're signed in now, and the app moves on by itself.
    } catch (e) {
      setErrors({ form: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (checkEmail) {
    return (
      <Screen>
        <BackButton />
        <Txt variant="title">Check your email</Txt>
        <Txt>
          We sent a link to {email.trim()}. Open it to confirm your account, then come back and sign in.
        </Txt>
        <Link href="/sign-in" replace asChild>
          <Button title="Go to sign in" />
        </Link>
      </Screen>
    );
  }

  return (
    <Screen keyboard>
      <BackButton />
      <View style={styles.heading}>
        <Txt variant="title">Create your account</Txt>
        <Txt variant="caption">Everyone in the family gets their own account.</Txt>
      </View>

      <TextField
        label="Your name"
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <TextField
        ref={emailRef}
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
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
        error={errors.password}
        hint="At least 6 characters."
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      {errors.form ? (
        <View style={styles.formError} accessibilityLiveRegion="polite">
          <Txt color={colors.warnInk}>{errors.form}</Txt>
        </View>
      ) : null}

      <Button title="Create account" onPress={submit} loading={busy} />

      <View style={styles.switch}>
        <Txt variant="caption">Already have an account?</Txt>
        <Link href="/sign-in" replace style={styles.link}>
          Sign in
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 6, marginTop: space.sm },
  formError: { backgroundColor: colors.warnSoft, borderRadius: radius.md, padding: space.md },
  switch: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  link: { color: colors.accent, fontWeight: '600', fontSize: 14, paddingVertical: 12 },
});
