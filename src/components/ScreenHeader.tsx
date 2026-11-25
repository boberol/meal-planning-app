import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { space } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

import { Avatar } from './Avatar';
import { Txt } from './Txt';

/**
 * The top of each tab: a small grey line, the big title, optional buttons,
 * and your avatar, which opens the Household screen.
 */
export function ScreenHeader({ eyebrow, title, actions }: { eyebrow?: string; title: string; actions?: ReactNode }) {
  const { profile } = useAuth();
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        {eyebrow ? <Txt variant="eyebrow">{eyebrow}</Txt> : null}
        <Txt variant="title">{title}</Txt>
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
      <Link href="/household" asChild>
        <Pressable accessibilityRole="button" accessibilityLabel="Household and settings" hitSlop={4} style={styles.avatar}>
          <Avatar name={profile?.display_name ?? ''} color={profile?.color} size={44} />
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md, paddingTop: space.md },
  text: { flex: 1, gap: 4 },
  actions: { flexDirection: 'row', gap: space.sm },
  avatar: { borderRadius: 999 },
});
