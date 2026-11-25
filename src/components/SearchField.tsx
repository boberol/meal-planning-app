import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, fonts, radius } from '@/constants/theme';

/** A search box with a magnifying glass and a clear button. */
export function SearchField({ value, onChangeText, placeholder, label }: { value: string; onChangeText: (t: string) => void; placeholder: string; label: string }) {
  return (
    <View style={styles.box}>
      <Ionicons name="search" size={18} color={colors.muted} importantForAccessibility="no" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.subtle}
        accessibilityLabel={label}
        returnKeyType="search"
        autoCorrect={false}
        style={styles.input}
        maxFontSizeMultiplier={1.4}
      />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onChangeText('')} hitSlop={10} style={styles.clear}>
          <Ionicons name="close-circle" size={20} color={colors.subtle} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.field,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 14,
    paddingRight: 6,
  },
  input: { flex: 1, height: 46, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  clear: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
