import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/constants/theme';

import { Txt } from './Txt';

/** A friendly card for screens that have nothing in them yet. */
export function EmptyState({
  icon,
  title,
  body,
  children,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap} importantForAccessibility="no-hide-descendants">
        <Ionicons name={icon} size={28} color={colors.accent} />
      </View>
      <Txt variant="heading" style={styles.center}>
        {title}
      </Txt>
      <Txt variant="caption" style={styles.center}>
        {body}
      </Txt>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: space.xxl,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    gap: space.sm,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  center: { textAlign: 'center' },
  actions: { alignSelf: 'stretch', marginTop: space.md, gap: space.sm },
});
