import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/constants/theme';

import { Screen } from './Screen';
import { Txt } from './Txt';

/**
 * Shown instead of the app when the Supabase keys are missing,
 * so a fresh checkout explains itself instead of crashing.
 */
export function SetupNeeded() {
  return (
    <Screen>
      <Txt variant="title">Almost there</Txt>
      <Txt>The app can’t reach its database yet, because the Supabase keys are missing.</Txt>
      <View style={styles.card}>
        <Txt variant="bodyStrong">Create a file called .env.local in the project folder:</Txt>
        <Txt style={styles.code}>
          EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co{'\n'}EXPO_PUBLIC_SUPABASE_KEY=your-publishable-key
        </Txt>
        <Txt variant="caption">Then stop and restart `npx expo start`. The full steps are in docs/SETUP.md.</Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  code: { fontFamily: 'monospace', fontSize: 13, lineHeight: 20, color: colors.ink },
});
