import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { tileTints } from '@/constants/theme';

/** Picks the same soft colour for a recipe every time, from its id. */
function tintFor(seed: string) {
  let n = 0;
  for (let i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) >>> 0;
  return tileTints[n % tileTints.length];
}

/**
 * A recipe's photo, or a coloured square with a fork and knife when it
 * doesn't have one yet. Decorative only: the recipe name is always shown next to it.
 */
export function RecipeTile({ photoUrl, seed, iconSize = 24, style }: { photoUrl?: string | null; seed: string; iconSize?: number; style?: StyleProp<ViewStyle> }) {
  const tint = tintFor(seed);
  return (
    <View style={[styles.tile, { backgroundColor: tint.bg }, style]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <Ionicons name="restaurant-outline" size={iconSize} color={tint.fg} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
