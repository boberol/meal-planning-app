import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { RecipeTile } from '@/components/RecipeTile';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchField } from '@/components/SearchField';
import { Txt } from '@/components/Txt';
import { colors, fonts, radius, space } from '@/constants/theme';
import { keys, usePullToRefresh } from '@/lib/query';
import { fetchRecipes, formatMinutes, SUGGESTED_TAGS, totalMinutes, type RecipeSummary } from '@/lib/recipes';
import { useHousehold } from '@/lib/useHousehold';

const ALL = 'All';
const FAVOURITES = 'Favourites';

/** The Recipes tab: the household's cookbook, with search and tag filters. */
export default function RecipesScreen() {
  const { householdId } = useHousehold();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(ALL);
  const { width } = useWindowDimensions();
  const cardWidth = (width - space.xl * 2 - space.md) / 2;

  const { data: recipes = [], isPending, error, refetch } = useQuery({
    queryKey: keys.recipes(householdId),
    queryFn: () => fetchRecipes(householdId),
  });
  const pull = usePullToRefresh(refetch);

  // Filters: All, Favourites (once there is one), then the tags in use.
  const tagsInUse = [...new Set(recipes.flatMap((r) => r.tags))].sort((a, b) => {
    const ia = SUGGESTED_TAGS.indexOf(a);
    const ib = SUGGESTED_TAGS.indexOf(b);
    if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    return a.localeCompare(b);
  });
  const filters = [ALL, ...(recipes.some((r) => r.is_favourite) ? [FAVOURITES] : []), ...tagsInUse];
  const activeFilter = filters.includes(filter) ? filter : ALL;

  const q = search.trim().toLowerCase();
  const shown = recipes.filter((r) => {
    if (activeFilter === FAVOURITES && !r.is_favourite) return false;
    if (activeFilter !== ALL && activeFilter !== FAVOURITES && !r.tags.includes(activeFilter)) return false;
    if (!q) return true;
    return r.name.toLowerCase().includes(q) || r.ingredientNames.some((n) => n.includes(q)) || r.tags.some((t) => t.toLowerCase().includes(q));
  });

  const hasRecipes = recipes.length > 0;

  return (
    <Screen
      refreshControl={<RefreshControl {...pull} tintColor={colors.accent} colors={[colors.accent]} />}
      overlay={hasRecipes ? <Fab label="Add recipe" onPress={() => router.push('/recipe/edit')} /> : null}>
      <ScreenHeader eyebrow="The family cookbook" title="Recipes" />

      {isPending ? (
        <ActivityIndicator color={colors.accent} style={styles.loading} />
      ) : error && !hasRecipes ? (
        <EmptyState icon="cloud-offline-outline" title="Couldn’t load your recipes" body={error.message}>
          <Button title="Try again" onPress={() => refetch()} />
        </EmptyState>
      ) : !hasRecipes ? (
        <EmptyState
          icon="book-outline"
          title="Your cookbook is empty"
          body="Add the meals your family makes most. Everyone in your household sees them on their own phone.">
          <Button title="Add your first recipe" onPress={() => router.push('/recipe/edit')} />
        </EmptyState>
      ) : (
        <>
          <View style={styles.tools}>
            <SearchField value={search} onChangeText={setSearch} placeholder="Search by name or ingredient" label="Search recipes" />
            {filters.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips}>
                {filters.map((f) => (
                  <Chip key={f} label={f} selected={f === activeFilter} onPress={() => setFilter(f)} accessibilityLabel={`Show ${f.toLowerCase()} recipes`} />
                ))}
              </ScrollView>
            ) : null}
          </View>

          {shown.length === 0 ? (
            <View style={styles.noMatch}>
              <Txt variant="body" color={colors.muted} style={styles.center}>
                {q ? `No recipes match “${search.trim()}”.` : 'No recipes with this tag yet.'}
              </Txt>
              <Button
                title="Show all recipes"
                variant="quiet"
                onPress={() => {
                  setSearch('');
                  setFilter(ALL);
                }}
              />
            </View>
          ) : (
            <View style={styles.grid}>
              {shown.map((r) => (
                <RecipeCard key={r.id} recipe={r} width={cardWidth} />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

function RecipeCard({ recipe, width }: { recipe: RecipeSummary; width: number }) {
  const time = formatMinutes(totalMinutes(recipe));
  const tag = recipe.tags[0];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[recipe.name, time, tag, recipe.is_favourite ? 'favourite' : null].filter(Boolean).join(', ')}
      onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}>
      <View>
        <RecipeTile photoUrl={recipe.photo_url} seed={recipe.id} iconSize={28} style={styles.cardTile} />
        {recipe.is_favourite ? (
          <View style={styles.heart}>
            <Ionicons name="heart" size={14} color={colors.warn} />
          </View>
        ) : null}
      </View>
      <View style={styles.cardBody}>
        <Txt variant="bodyStrong" numberOfLines={2} style={styles.cardName}>
          {recipe.name}
        </Txt>
        {time ? (
          <View style={styles.meta}>
            <Ionicons name="time-outline" size={13} color={colors.muted} />
            <Txt variant="caption" style={styles.metaText}>
              {time}
            </Txt>
          </View>
        ) : null}
        {tag ? (
          <View style={styles.pill}>
            <Txt style={styles.pillText}>{tag}</Txt>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: space.xxl },
  tools: { gap: space.md },
  chipScroll: { marginHorizontal: -space.xl },
  chips: { paddingHorizontal: space.xl, gap: space.sm },
  noMatch: { gap: space.md, paddingVertical: space.xl },
  center: { textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  pressed: { transform: [{ scale: 0.98 }] },
  cardTile: { height: 112 },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { paddingHorizontal: space.md, paddingTop: 10, paddingBottom: space.md, gap: 6 },
  cardName: { lineHeight: 20 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
  pill: { alignSelf: 'flex-start', backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: colors.accentInk },
});
