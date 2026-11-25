import { Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';

import { colors, fonts, radius, space } from '@/constants/theme';

import { Txt } from './Txt';

/** The top of a form screen: Cancel on the left, the title, and Save on the right. */
export function ModalHeader({ title, onCancel, onSave, saveLabel = 'Save', saving = false }: { title: string; onCancel: () => void; onSave: () => void; saveLabel?: string; saving?: boolean }) {
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" onPress={onCancel} hitSlop={8} style={styles.side}>
        <Text style={styles.cancel} maxFontSizeMultiplier={1.4}>
          Cancel
        </Text>
      </Pressable>
      <Txt variant="heading" style={styles.title} numberOfLines={1}>
        {title}
      </Txt>
      <View style={[styles.side, styles.right]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: saving, disabled: saving }}
          disabled={saving}
          onPress={onSave}
          style={({ pressed }) => [styles.save, pressed && { backgroundColor: colors.accentPressed }]}>
          {saving ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.saveText} maxFontSizeMultiplier={1.4}>{saveLabel}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.sm },
  side: { width: 88, height: 44, justifyContent: 'center', paddingHorizontal: space.sm },
  right: { alignItems: 'flex-end', paddingHorizontal: 0 },
  cancel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  title: { flex: 1, textAlign: 'center' },
  save: { minWidth: 72, height: 40, borderRadius: radius.pill, backgroundColor: colors.accent, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.onAccent },
});
