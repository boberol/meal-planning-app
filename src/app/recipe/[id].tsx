import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { RecipeTile } from '@/components/RecipeTile';
import { Stepper } from '@/components/Stepper';
import { Txt } from '@/components/Txt';
import { colors, fonts, radius, space } from '@/constants/theme';
import { keys } from '@/lib/query';
import { fetchRecipe, formatMinutes, setFavourite, totalMinutes, type Recipe, type RecipeSummary } from '@/lib/recipes';
import { formatQuantity } from '@/lib/units';
import { useHousehold, useMembers } from '@/lib/useHousehold';

const HERO = 248;

/** One recipe: photo, servings, ingredients, steps and notes. */
export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: recipe, isPending, error, refetch } = useQuery({ queryKey: keys.recipe(id), queryFn: () => fetchRecipe(id) });

  if (isPending || error || !recipe) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.topBarStatic}>
          <BackButton label="Back to recipes" />
        </View>
        <View style={styles.message}>
          {isPending ? (
            <ActivityIndicator color={colors.accent} />
          ) : error ? (
            <EmptyState icon="cloud-offline-outline" title="Couldn’t load this recipe" body={error.message}>
              <Button title="Try again" onPress={() => refetch()} />
            </EmptyState>
          ) : (
            <EmptyState icon="trash-outline" title="This recipe was deleted" body="Someone in your household may have removed it.">
              <Button title="Back to recipes" onPress={() => router.back()} />
            </EmptyState>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Start the servings counter again if someone changes the recipe's servings.
  return <RecipeView key={`${recipe.id}:${recipe.servings}`} recipe={recipe} />;
}

function RecipeView({ recipe }: { recipe: Recipe }) {
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const { householdId } = useHousehold();
  const { nameOf } = useMembers();
  // Changing servings here only changes the amounts you see, not the saved recipe.
  const [servings, setServings] = useState(recipe.servings);
  const scale = servings / recipe.servings;

  const favourite = useMutation({
    mutationFn: (value: boolean) => setFavourite(recipe.id, value),
    // Show the heart change straight away, and undo it if saving fails.
    onMutate: async (value) => {
      await client.cancelQueries({ queryKey: keys.recipe(recipe.id) });
      const before = client.getQueryData<Recipe>(keys.recipe(recipe.id));
      client.setQueryData<Recipe | null>(keys.recipe(recipe.id), (r) => (r ? { ...r, is_favourite: value } : r));
      client.setQueryData<RecipeSummary[]>(keys.recipes(householdId), (list) => list?.map((r) => (r.id === recipe.id ? { ...r, is_favourite: value } : r)));
      return { before };
    },
    onError: (e, _value, context) => {
      if (context?.before) client.setQueryData(keys.recipe(recipe.id), context.before);
      Alert.alert('Couldn’t change favourites', e.message);
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: keys.recipe(recipe.id) });
      client.invalidateQueries({ queryKey: keys.recipes(householdId) });
    },
  });

  const addedBy = nameOf(recipe.created_by);
  const meta = [formatMinutes(totalMinutes(recipe)), recipe.tags.slice(0, 2).join(', ') || null, addedBy ? `Added by ${addedBy}` : null].filter(Boolean).join(' · ');

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}>
        <RecipeTile photoUrl={recipe.photo_url} seed={recipe.id} iconSize={40} style={{ height: HERO + insets.top }} />

        <View style={styles.sheet}>
          <View style={styles.titleBlock}>
            <Txt variant="title" style={styles.title}>
              {recipe.name}
            </Txt>
            {meta ? <Txt variant="caption" style={styles.meta}>{meta}</Txt> : null}
          </View>

          <Stepper label="Servings" value={servings} onChange={setServings} />

          <View style={styles.section}>
            <Txt variant="heading">Ingredients</Txt>
            {recipe.lines.length ? (
              <View style={styles.card}>
                {recipe.lines.map((line, i) => (
                  <View key={line.id} style={[styles.line, i < recipe.lines.length - 1 && styles.lineDivider]}>
                    <View style={styles.lineText}>
                      <Txt variant="body">{line.name}</Txt>
                      {line.note ? <Txt variant="caption">{line.note}</Txt> : null}
                    </View>
                    <Txt style={styles.amount}>{formatQuantity(line.amount == null ? null : line.amount * scale, line.unit)}</Txt>
                  </View>
                ))}
              </View>
            ) : (
              <Txt variant="caption">No ingredients added yet.</Txt>
            )}
          </View>

          {recipe.steps.length ? (
            <View style={styles.section}>
              <Txt variant="heading">Steps</Txt>
              <View style={styles.steps}>
                {recipe.steps.map((step, i) => (
                  <View key={i} style={styles.step}>
                    <View style={styles.stepNumber}>
                      <Txt style={styles.stepNumberText}>{i + 1}</Txt>
                    </View>
                    <Txt variant="body" style={styles.stepText}>
                      {step}
                    </Txt>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {recipe.notes ? (
            <View style={styles.section}>
              <Txt variant="heading">Notes</Txt>
              <View style={[styles.card, styles.notes]}>
                <Txt variant="body">{recipe.notes}</Txt>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Buttons that float over the photo. */}
      <View style={[styles.topBar, { top: insets.top + space.sm }]}>
        <IconButton icon="chevron-back" label="Back" look="raised" onPress={() => (router.canGoBack() ? router.back() : router.replace('/recipes'))} />
        <View style={styles.topActions}>
          <IconButton icon="create-outline" label="Edit recipe" look="raised" onPress={() => router.push({ pathname: '/recipe/edit', params: { id: recipe.id } })} />
          <IconButton
            icon={recipe.is_favourite ? 'heart' : 'heart-outline'}
            label={recipe.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
            selected={recipe.is_favourite}
            color={recipe.is_favourite ? colors.warn : colors.ink}
            look="raised"
            onPress={() => favourite.mutate(!recipe.is_favourite)}
          />
        </View>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + space.md }]}>
        <Button
          title="Add to meal plan"
          onPress={() => router.push({ pathname: '/plan/meal', params: { recipeId: recipe.id, servings: String(servings) } })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.ground },
  topBarStatic: { paddingHorizontal: space.lg, paddingTop: space.sm },
  message: { flex: 1, justifyContent: 'center', padding: space.xl },
  sheet: {
    marginTop: -24,
    backgroundColor: colors.ground,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.xl,
    paddingTop: 22,
    gap: space.lg,
  },
  titleBlock: { gap: 6 },
  title: { fontSize: 26, lineHeight: 32 },
  meta: { fontSize: 14, lineHeight: 20 },
  section: { gap: space.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: space.lg },
  line: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10 },
  lineDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  lineText: { flex: 1 },
  amount: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted, fontVariant: ['tabular-nums'] },
  steps: { gap: space.md },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginTop: -2 },
  stepNumberText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.accentInk },
  stepText: { flex: 1 },
  notes: { paddingVertical: space.md },
  topBar: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between' },
  topActions: { flexDirection: 'row', gap: space.sm },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: space.md,
    paddingHorizontal: space.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
