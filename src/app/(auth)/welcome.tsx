import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Txt } from '@/components/Txt';
import { colors, fonts, radius, space } from '@/constants/theme';

/** The first screen a new person sees. */
export default function Welcome() {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.top}>
        <Txt style={styles.wordmark}>Pantrio</Txt>
      </View>

      <View style={styles.middle}>
        <Txt variant="title" style={styles.headline}>
          One meal plan for the whole household.
        </Txt>
        <View style={styles.features}>
          <Feature icon="calendar-outline" text="Plan the week’s meals together" />
          <Feature icon="cart-outline" text="Shop only for what you’re missing" />
          <Feature icon="flame-outline" text="Cook from what’s already at home" />
        </View>
      </View>

      <View style={styles.actions}>
        <Button title="Create an account" onPress={() => router.push('/sign-up')} />
        <Button title="Sign in" variant="quiet" onPress={() => router.push('/sign-in')} />
      </View>
    </SafeAreaView>
  );
}

function Feature({ icon, text }: { icon: ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon} importantForAccessibility="no-hide-descendants">
        <Ionicons name={icon} size={20} color={colors.accent} />
      </View>
      <Txt variant="bodyStrong" style={styles.featureText}>
        {text}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.ground, paddingHorizontal: space.xl },
  top: { paddingTop: space.lg },
  wordmark: { fontFamily: fonts.headingHeavy, fontSize: 22, color: colors.accent, letterSpacing: -0.3 },
  middle: { flex: 1, justifyContent: 'center', gap: space.xxl },
  headline: { fontSize: 34, lineHeight: 40 },
  features: { gap: space.md },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1 },
  actions: { gap: space.sm, paddingBottom: space.lg },
});
