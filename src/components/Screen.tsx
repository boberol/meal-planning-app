import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, space } from '@/constants/theme';

/**
 * The page every screen sits on: the grey-green background, safe margins
 * around the phone's notch, and scrolling when the content is long.
 */
export function Screen({ children, scroll = true, keyboard = false }: { children: ReactNode; scroll?: boolean; keyboard?: boolean }) {
  const content = scroll ? (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fill]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.page} edges={['top', 'left', 'right']}>
      {keyboard ? (
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.ground },
  fill: { flex: 1 },
  content: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.xxl * 2, gap: space.lg },
});
