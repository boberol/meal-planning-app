/**
 * Add or edit a recipe.
 *
 * Opened as /recipe/edit for a new recipe, or /recipe/edit?id=… to change one.
 * Everything you type is kept in one "draft" object on this screen. Nothing is
 * saved until you press Save, which uploads the photo (if you picked a new one)
 * and then saves the whole recipe in one database call.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { ModalHeader } from '@/components/ModalHeader';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { colors, fonts, radius, space } from '@/constants/theme';
import { deletePhoto, pickPhoto, uploadPhoto } from '@/lib/photos';
import { keys } from '@/lib/query';
import {
  deleteRecipe,
  fetchRecipe,
  saveRecipe,
  searchIngredients,
  SUGGESTED_TAGS,
  type Ingredient,
  type Recipe,
  type RecipeSummary,
} from '@/lib/recipes';
import { formatAmount, parseAmount, UNITS, unitLabel, unitName } from '@/lib/units';
import { useHousehold } from '@/lib/useHousehold';

// ---------------------------------------------------------------------------
// The draft: what's on screen while you edit.
// ---------------------------------------------------------------------------

type DraftLine = {
  key: string;
  /** What's typed, e.g. "Onion, chopped". The part after a comma is saved as a note. */
  text: string;
  amount: string;
  unit: string | null;
  /** The food picked from the suggestions, while the name still matches it. */
  ingredientId: string | null;
  ingredientName: string | null;
};

type DraftStep = { key: string; text: string };

type Draft = {
  name: string;
  /** A web address for a saved photo, or a file on the phone for a newly picked one. */
  photo: string | null;
  servings: string;
  prep: string;
  cook: string;
  tags: string[];
  notes: string;
  lines: DraftLine[];
  steps: DraftStep[];
};

type Errors = { name?: string; servings?: string; prep?: string; cook?: string; lines?: Record<string, string> };

let lastKey = 0;
const newKey = () => String(++lastKey);

const emptyLine = (): DraftLine => ({ key: newKey(), text: '', amount: '', unit: null, ingredientId: null, ingredientName: null });
const emptyStep = (): DraftStep => ({ key: newKey(), text: '' });

function blankDraft(): Draft {
  return { name: '', photo: null, servings: '4', prep: '', cook: '', tags: [], notes: '', lines: [emptyLine(), emptyLine()], steps: [emptyStep()] };
}

function draftFrom(r: Recipe): Draft {
  return {
    name: r.name,
    photo: r.photo_url,
    servings: String(r.servings),
    prep: r.prep_min == null ? '' : String(r.prep_min),
    cook: r.cook_min == null ? '' : String(r.cook_min),
    tags: r.tags,
    notes: r.notes ?? '',
    lines: [
      ...r.lines.map((l) => ({
        key: newKey(),
        text: l.note ? `${l.name}, ${l.note}` : l.name,
        amount: l.amount == null ? '' : formatAmount(l.amount),
        unit: l.unit,
        ingredientId: l.ingredient_id,
        ingredientName: l.name,
      })),
      emptyLine(),
    ],
    steps: r.steps.length ? r.steps.map((text) => ({ key: newKey(), text })) : [emptyStep()],
  };
}

/** "Onion, chopped" → { name: "Onion", note: "chopped" }. */
function splitLine(text: string): { name: string; note: string | null } {
  const [name, ...rest] = text.split(',');
  return { name: name.trim(), note: rest.join(',').trim() || null };
}

function wholeNumber(text: string, min: number, max: number): number | null | typeof NaN {
  const t = text.trim();
  if (t === '') return null;
  if (!/^\d+$/.test(t)) return NaN;
  const n = Number(t);
  return n < min || n > max ? NaN : n;
}

function validate(d: Draft): Errors {
  const errors: Errors = {};
  if (!d.name.trim()) errors.name = 'Give the recipe a name.';
  const servings = wholeNumber(d.servings, 1, 50);
  if (servings == null || Number.isNaN(servings)) errors.servings = 'Use a number from 1 to 50.';
  if (Number.isNaN(wholeNumber(d.prep, 0, 1440))) errors.prep = 'Minutes, as a whole number.';
  if (Number.isNaN(wholeNumber(d.cook, 0, 1440))) errors.cook = 'Minutes, as a whole number.';
  const lines: Record<string, string> = {};
  for (const l of d.lines) {
    const amount = parseAmount(l.amount);
    if (Number.isNaN(amount)) lines[l.key] = 'Amount should be a number, like 2, 0.5 or 1/2.';
    else if (!splitLine(l.text).name && (amount != null || l.unit)) lines[l.key] = 'Add what the ingredient is.';
  }
  if (Object.keys(lines).length) errors.lines = lines;
  return errors;
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

// ---------------------------------------------------------------------------
// The screen
// ---------------------------------------------------------------------------

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, isPending, error, refetch } = useQuery({
    queryKey: keys.recipe(id ?? ''),
    queryFn: () => fetchRecipe(id as string),
    enabled: Boolean(id),
  });

  if (id && (isPending || error || !data)) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.loadingHeader}>
          <Button title="Close" variant="quiet" onPress={() => router.back()} />
        </View>
        <View style={styles.message}>
          {isPending ? (
            <ActivityIndicator color={colors.accent} />
          ) : error ? (
            <EmptyState icon="cloud-offline-outline" title="Couldn’t load this recipe" body={error.message}>
              <Button title="Try again" onPress={() => refetch()} />
            </EmptyState>
          ) : (
            <EmptyState icon="trash-outline" title="This recipe was deleted" body="Someone in your household may have removed it." />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // The editor only starts once the recipe has loaded, so its draft starts from the saved recipe.
  return <Editor recipe={id ? (data ?? null) : null} />;
}

function Editor({ recipe }: { recipe: Recipe | null }) {
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const { householdId } = useHousehold();

  const [initial] = useState(() => (recipe ? draftFrom(recipe) : blankDraft()));
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [unitFor, setUnitFor] = useState<string | null>(null);
  const [activeLine, setActiveLine] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState<string | null>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  // Leaving with unsaved changes (Cancel, the back gesture or Android's back
  // button) asks first, so a recipe isn't lost by accident.
  const allowLeave = usePreventRemove(dirty && !leaving, ({ repeat }) => {
    Alert.alert('Discard your changes?', 'This recipe has changes that aren’t saved yet.', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          setLeaving(true);
          repeat();
        },
      },
    ]);
  });

  function update(patch: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...patch }));
  }
  function updateLine(key: string, patch: Partial<DraftLine>) {
    setDraft((d) => ({ ...d, lines: d.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) }));
  }
  function updateStep(key: string, text: string) {
    setDraft((d) => ({ ...d, steps: d.steps.map((s) => (s.key === key ? { ...s, text } : s)) }));
  }

  // Ingredient suggestions for the row you're typing in.
  const activeText = splitLine(draft.lines.find((l) => l.key === activeLine)?.text ?? '').name;
  const query = useDebounced(activeText, 200);
  const suggestions = useQuery({
    queryKey: keys.ingredientSearch(query.toLowerCase()),
    queryFn: () => searchIngredients(query),
    enabled: query.length > 0,
    staleTime: 5 * 60_000,
  });

  function chooseIngredient(line: DraftLine, food: Ingredient) {
    const { note } = splitLine(line.text);
    updateLine(line.key, {
      text: note ? `${food.name}, ${note}` : food.name,
      ingredientId: food.id,
      ingredientName: food.name,
      unit: line.unit ?? food.default_unit,
    });
    setActiveLine(null);
  }

  function typeLine(line: DraftLine, text: string) {
    // Once the name no longer matches the picked food, forget the pick.
    const stillSame = line.ingredientName != null && splitLine(text).name.toLowerCase() === line.ingredientName.toLowerCase();
    updateLine(line.key, { text, ...(stillSame ? {} : { ingredientId: null, ingredientName: null }) });
  }

  // Tags: the usual ones, any your household already uses, and this recipe's.
  const householdTags = client.getQueryData<RecipeSummary[]>(keys.recipes(householdId))?.flatMap((r) => r.tags) ?? [];
  const tagOptions = [...new Set([...SUGGESTED_TAGS, ...householdTags, ...draft.tags])];

  function toggleTag(tag: string) {
    update({ tags: draft.tags.includes(tag) ? draft.tags.filter((t) => t !== tag) : [...draft.tags, tag] });
  }

  function addTag() {
    const tag = (tagInput ?? '').trim().slice(0, 24);
    if (tag && !draft.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) update({ tags: [...draft.tags, tag] });
    setTagInput(null);
  }

  async function choosePhoto() {
    try {
      const uri = await pickPhoto();
      if (uri) update({ photo: uri });
    } catch (e) {
      Alert.alert('Couldn’t open your photos', (e as Error).message);
    }
  }

  function moveStep(index: number) {
    setDraft((d) => {
      const steps = [...d.steps];
      [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]];
      return { ...d, steps };
    });
  }

  async function save() {
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length) {
      Alert.alert('Check the recipe', 'Some fields need a fix. They’re marked in orange.');
      return;
    }

    setSaving(true);
    let uploaded: string | null = null;
    try {
      let photoUrl = draft.photo;
      if (draft.photo && !draft.photo.startsWith('http')) {
        uploaded = await uploadPhoto(householdId, draft.photo);
        photoUrl = uploaded;
      }

      const id = await saveRecipe({
        id: recipe?.id ?? null,
        name: draft.name.trim(),
        photo_url: photoUrl,
        servings: Number(draft.servings),
        prep_min: wholeNumber(draft.prep, 0, 1440),
        cook_min: wholeNumber(draft.cook, 0, 1440),
        tags: draft.tags,
        notes: draft.notes.trim() || null,
        ingredients: draft.lines
          .filter((l) => splitLine(l.text).name)
          .map((l) => {
            const { name, note } = splitLine(l.text);
            return { ingredient_id: l.ingredientId, name, amount: parseAmount(l.amount), unit: l.unit, note };
          }),
        steps: draft.steps.map((s) => s.text.trim()).filter(Boolean),
      });

      // The old photo isn't needed once it's replaced or removed.
      if (recipe?.photo_url && recipe.photo_url !== photoUrl) deletePhoto(recipe.photo_url);

      await Promise.all([
        client.invalidateQueries({ queryKey: keys.recipes(householdId) }),
        client.invalidateQueries({ queryKey: keys.recipe(id) }),
        client.invalidateQueries({ queryKey: keys.planAll(householdId) }),
      ]);

      setLeaving(true);
      allowLeave();
      if (recipe) router.back();
      else router.replace({ pathname: '/recipe/[id]', params: { id } });
    } catch (e) {
      if (uploaded) deletePhoto(uploaded);
      Alert.alert('Couldn’t save the recipe', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!recipe) return;
    Alert.alert('Delete this recipe?', 'It’s also taken off the meal plan. This can’t be undone.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete recipe',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteRecipe(recipe.id);
            deletePhoto(recipe.photo_url);
            client.invalidateQueries({ queryKey: keys.recipes(householdId) });
            client.invalidateQueries({ queryKey: keys.planAll(householdId) });
            setLeaving(true);
            allowLeave();
            router.dismissAll();
          } catch (e) {
            Alert.alert('Couldn’t delete the recipe', (e as Error).message);
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  const unitLine = draft.lines.find((l) => l.key === unitFor);

  return (
    <SafeAreaView style={styles.page} edges={['top', 'left', 'right']}>
      <ModalHeader title={recipe ? 'Edit recipe' : 'New recipe'} onCancel={() => router.back()} onSave={save} saving={saving} />

      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xxl * 2 }]} keyboardShouldPersistTaps="handled">
          {/* Photo */}
          {draft.photo ? (
            <View style={styles.photoWrap}>
              <Image source={{ uri: draft.photo }} style={styles.photo} contentFit="cover" accessibilityLabel="Recipe photo" />
              <View style={styles.photoActions}>
                <Button title="Change photo" variant="quiet" onPress={choosePhoto} style={styles.photoButton} />
                <Button title="Remove" variant="danger" onPress={() => update({ photo: null })} style={styles.photoButton} />
              </View>
            </View>
          ) : (
            <Pressable accessibilityRole="button" onPress={choosePhoto} style={({ pressed }) => [styles.addPhoto, pressed && styles.pressed]}>
              <Ionicons name="camera-outline" size={26} color={colors.accent} />
              <Txt variant="bodyStrong" color={colors.accent}>
                Add a photo
              </Txt>
            </Pressable>
          )}

          <TextField
            label="Recipe name"
            value={draft.name}
            onChangeText={(name) => update({ name })}
            placeholder="Tomato and basil pasta"
            error={errors.name}
            autoCapitalize="sentences"
            maxLength={120}
            onFocus={() => setActiveLine(null)}
          />

          <View style={styles.threeUp}>
            <View style={styles.third}>
              <TextField label="Servings" value={draft.servings} onChangeText={(servings) => update({ servings })} keyboardType="number-pad" maxLength={2} error={errors.servings} onFocus={() => setActiveLine(null)} />
            </View>
            <View style={styles.third}>
              <TextField label="Prep (min)" value={draft.prep} onChangeText={(prep) => update({ prep })} keyboardType="number-pad" maxLength={4} placeholder="15" error={errors.prep} onFocus={() => setActiveLine(null)} />
            </View>
            <View style={styles.third}>
              <TextField label="Cook (min)" value={draft.cook} onChangeText={(cook) => update({ cook })} keyboardType="number-pad" maxLength={4} placeholder="30" error={errors.cook} onFocus={() => setActiveLine(null)} />
            </View>
          </View>

          {/* Tags */}
          <View style={styles.group}>
            <Txt variant="label">Tags</Txt>
            <View style={styles.wrapRow}>
              {tagOptions.map((tag) => (
                <Chip key={tag} label={tag} selected={draft.tags.includes(tag)} onPress={() => toggleTag(tag)} />
              ))}
              {tagInput == null ? (
                <Chip label="+ New tag" selected={false} onPress={() => setTagInput('')} accessibilityLabel="Add a new tag" />
              ) : (
                <TextInput
                  autoFocus
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={addTag}
                  onBlur={addTag}
                  placeholder="Tag name"
                  placeholderTextColor={colors.subtle}
                  accessibilityLabel="New tag name"
                  returnKeyType="done"
                  maxLength={24}
                  style={styles.tagInput}
                />
              )}
            </View>
          </View>

          {/* Ingredients */}
          <View style={styles.group}>
            <Txt variant="heading">Ingredients</Txt>
            <Txt variant="caption">Add details after a comma, like “Onion, chopped”.</Txt>
            {draft.lines.map((line, i) => {
              const lineError = errors.lines?.[line.key];
              const showSuggestions = activeLine === line.key && query.length > 0 && splitLine(line.text).name === query;
              const options = (suggestions.data ?? []).filter((f) => f.id !== line.ingredientId);
              return (
                <View key={line.key} style={styles.lineBlock}>
                  <View style={styles.lineRow}>
                    <TextInput
                      value={line.amount}
                      onChangeText={(amount) => updateLine(line.key, { amount })}
                      onFocus={() => setActiveLine(null)}
                      placeholder="2"
                      placeholderTextColor={colors.subtle}
                      keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                      accessibilityLabel={`Amount, ingredient ${i + 1}`}
                      maxLength={8}
                      style={[styles.cell, styles.amountCell, lineError && styles.cellError]}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Unit, ingredient ${i + 1}: ${unitName(line.unit)}`}
                      onPress={() => setUnitFor(line.key)}
                      style={[styles.cell, styles.unitCell]}>
                      <Txt style={line.unit ? styles.unitText : styles.unitPlaceholder} numberOfLines={1}>
                        {line.unit ? unitLabel(line.unit) : 'unit'}
                      </Txt>
                      <Ionicons name="chevron-down" size={14} color={colors.muted} />
                    </Pressable>
                    <TextInput
                      value={line.text}
                      onChangeText={(t) => typeLine(line, t)}
                      onFocus={() => setActiveLine(line.key)}
                      placeholder={i === 0 ? 'Onion, chopped' : 'Ingredient'}
                      placeholderTextColor={colors.subtle}
                      accessibilityLabel={`Ingredient ${i + 1}`}
                      autoCapitalize="sentences"
                      returnKeyType="next"
                      onSubmitEditing={() => {
                        if (i === draft.lines.length - 1) update({ lines: [...draft.lines, emptyLine()] });
                        setActiveLine(null);
                      }}
                      maxLength={120}
                      style={[styles.cell, styles.nameCell, activeLine === line.key && styles.cellFocused, lineError && styles.cellError]}
                    />
                    <IconButton
                      icon="close"
                      label={`Remove ingredient ${i + 1}`}
                      look="bare"
                      color={colors.muted}
                      onPress={() => update({ lines: draft.lines.length > 1 ? draft.lines.filter((l) => l.key !== line.key) : [emptyLine()] })}
                      style={styles.removeButton}
                    />
                  </View>
                  {lineError ? (
                    <Txt variant="caption" color={colors.warn}>
                      {lineError}
                    </Txt>
                  ) : null}
                  {showSuggestions && options.length ? (
                    <View style={styles.suggestions} accessibilityRole="list">
                      {options.map((food) => (
                        <Pressable
                          key={food.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Use ${food.name}`}
                          onPress={() => chooseIngredient(line, food)}
                          style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}>
                          <Txt variant="body">{food.name}</Txt>
                          {food.household_id ? <Txt variant="caption">Added by your household</Txt> : null}
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
            <Button
              title="Add ingredient"
              variant="quiet"
              icon={<Ionicons name="add" size={18} color={colors.ink} />}
              onPress={() => update({ lines: [...draft.lines, emptyLine()] })}
            />
          </View>

          {/* Steps */}
          <View style={styles.group}>
            <Txt variant="heading">Steps</Txt>
            {draft.steps.map((step, i) => (
              <View key={step.key} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Txt style={styles.stepNumberText}>{i + 1}</Txt>
                </View>
                <TextInput
                  value={step.text}
                  onChangeText={(t) => updateStep(step.key, t)}
                  onFocus={() => setActiveLine(null)}
                  placeholder={i === 0 ? 'Fry the onion until soft.' : 'Next step'}
                  placeholderTextColor={colors.subtle}
                  accessibilityLabel={`Step ${i + 1}`}
                  multiline
                  textAlignVertical="top"
                  maxLength={2000}
                  style={[styles.cell, styles.stepInput]}
                />
                <View style={styles.stepTools}>
                  <IconButton icon="arrow-up" label={`Move step ${i + 1} up`} look="bare" color={colors.muted} disabled={i === 0} onPress={() => moveStep(i)} />
                  <IconButton
                    icon="close"
                    label={`Remove step ${i + 1}`}
                    look="bare"
                    color={colors.muted}
                    onPress={() => update({ steps: draft.steps.length > 1 ? draft.steps.filter((s) => s.key !== step.key) : [emptyStep()] })}
                  />
                </View>
              </View>
            ))}
            <Button
              title="Add step"
              variant="quiet"
              icon={<Ionicons name="add" size={18} color={colors.ink} />}
              onPress={() => update({ steps: [...draft.steps, emptyStep()] })}
            />
          </View>

          <TextField
            label="Notes"
            value={draft.notes}
            onChangeText={(notes) => update({ notes })}
            placeholder="Swaps, tips, where the recipe is from…"
            multiline
            textAlignVertical="top"
            maxLength={4000}
            style={styles.notes}
            onFocus={() => setActiveLine(null)}
          />

          {recipe ? <Button title="Delete recipe" variant="danger" onPress={confirmDelete} loading={deleting} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <UnitSheet
        visible={unitLine != null}
        current={unitLine?.unit ?? null}
        onPick={(unit) => {
          if (unitLine) updateLine(unitLine.key, { unit });
          setUnitFor(null);
        }}
        onClose={() => setUnitFor(null)}
      />
    </SafeAreaView>
  );
}

/** A sheet from the bottom with every unit to choose from. */
function UnitSheet({ visible, current, onPick, onClose }: { visible: boolean; current: string | null; onPick: (unit: string | null) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
        <Txt variant="heading" style={styles.sheetTitle}>
          Unit
        </Txt>
        <ScrollView style={styles.sheetList}>
          {[{ value: null, label: '', name: 'No unit' }, ...UNITS].map((u) => {
            const selected = (u.value ?? null) === current;
            return (
              <Pressable
                key={u.value ?? 'none'}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onPick(u.value)}
                style={({ pressed }) => [styles.sheetRow, pressed && styles.suggestionPressed]}>
                <Txt variant={selected ? 'bodyStrong' : 'body'} style={styles.fill}>
                  {u.name.charAt(0).toUpperCase() + u.name.slice(1)}
                  {u.label && u.label !== u.name ? <Txt variant="caption">{`  ${u.label}`}</Txt> : null}
                </Txt>
                {selected ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.ground },
  fill: { flex: 1 },
  loadingHeader: { padding: space.md, alignItems: 'flex-start' },
  message: { flex: 1, justifyContent: 'center', padding: space.xl },
  content: { paddingHorizontal: space.xl, paddingTop: space.sm, gap: space.xl },
  pressed: { transform: [{ scale: 0.98 }] },

  addPhoto: {
    height: 120,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#B9C4BB',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  photoWrap: { gap: space.sm },
  photo: { height: 200, borderRadius: radius.lg, backgroundColor: colors.line },
  photoActions: { flexDirection: 'row', gap: space.sm },
  photoButton: { flex: 1, minHeight: 44 },

  threeUp: { flexDirection: 'row', gap: space.md },
  third: { flex: 1 },

  group: { gap: space.sm },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tagInput: {
    height: 36,
    minWidth: 120,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
  },

  lineBlock: { gap: 6 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, width: '100%' },
  cell: {
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.field,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
  },
  cellFocused: { borderColor: colors.accent, borderWidth: 1.5 },
  cellError: { borderColor: colors.warn, borderWidth: 1.5 },
  amountCell: { width: 60 },
  unitCell: { width: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  unitText: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink, flexShrink: 1 },
  unitPlaceholder: { fontFamily: fonts.regular, fontSize: 15, color: colors.subtle },
  nameCell: { flex: 1, minWidth: 0, paddingHorizontal: 12 },
  removeButton: { width: 36 },
  suggestions: {
    marginLeft: 144,
    marginRight: 44,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 6,
    shadowColor: colors.ink,
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  suggestion: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderRadius: radius.sm },
  suggestionPressed: { backgroundColor: colors.accentSoft },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  stepNumberText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.accentInk },
  stepInput: { flex: 1, height: undefined, minHeight: 88, paddingTop: 12, paddingBottom: 12, lineHeight: 21 },
  stepTools: { width: 36, alignItems: 'center' },

  notes: { minHeight: 100, paddingTop: 12, paddingBottom: 12 },

  scrim: { flex: 1, backgroundColor: 'rgba(20, 32, 25, 0.4)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: space.lg,
    paddingHorizontal: space.lg,
    maxHeight: '70%',
  },
  sheetTitle: { paddingHorizontal: space.sm, paddingBottom: space.sm },
  sheetList: { flexGrow: 0 },
  sheetRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, borderRadius: radius.sm },
});
