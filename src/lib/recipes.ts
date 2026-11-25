/**
 * Reading and saving recipes.
 *
 * Saving goes through the save_recipe database function (see the Step 2
 * migration), which stores the recipe, its ingredient lines and its steps in
 * one go, so a recipe can never be half-saved.
 */
import { friendlyError } from './errors';
import { supabase } from './supabase';

export type RecipeSummary = {
  id: string;
  name: string;
  photo_url: string | null;
  servings: number;
  prep_min: number | null;
  cook_min: number | null;
  tags: string[];
  is_favourite: boolean;
  created_by: string | null;
  updated_at: string;
  /** Lower-case ingredient names, so the list can be searched by ingredient. */
  ingredientNames: string[];
};

export type RecipeLine = {
  id: string;
  ingredient_id: string;
  name: string;
  amount: number | null;
  unit: string | null;
  note: string | null;
};

export type Recipe = Omit<RecipeSummary, 'ingredientNames'> & {
  notes: string | null;
  lines: RecipeLine[];
  steps: string[];
};

export type Ingredient = {
  id: string;
  household_id: string | null;
  name: string;
  aliases: string[];
  aisle: string;
  default_unit: string;
};

/** What the editor sends to save_recipe. `id` is null for a new recipe. */
export type RecipeInput = {
  id: string | null;
  name: string;
  photo_url: string | null;
  servings: number;
  prep_min: number | null;
  cook_min: number | null;
  tags: string[];
  notes: string | null;
  ingredients: { ingredient_id: string | null; name: string; amount: number | null; unit: string | null; note: string | null }[];
  steps: string[];
};

/** Tags offered in the editor and as filters, before a household adds its own. */
export const SUGGESTED_TAGS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Quick', 'Vegetarian', 'Kids', 'Dessert'];

export function totalMinutes(r: { prep_min: number | null; cook_min: number | null }): number | null {
  if (r.prep_min == null && r.cook_min == null) return null;
  return (r.prep_min ?? 0) + (r.cook_min ?? 0);
}

/** "25 min", "1 h 10 min". */
export function formatMinutes(min: number | null): string | null {
  if (min == null) return null;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

type Row = Record<string, unknown>;

export async function fetchRecipes(householdId: string): Promise<RecipeSummary[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, name, photo_url, servings, prep_min, cook_min, tags, is_favourite, created_by, updated_at, recipe_ingredients(ingredients(name))')
    .eq('household_id', householdId);
  if (error) throw new Error(friendlyError(error));
  return ((data ?? []) as Row[])
    .map((r) => {
      const { recipe_ingredients, ...rest } = r as Row & { recipe_ingredients: { ingredients: { name: string } | null }[] };
      return {
        ...(rest as Omit<RecipeSummary, 'ingredientNames'>),
        ingredientNames: (recipe_ingredients ?? []).map((l) => l.ingredients?.name.toLowerCase() ?? '').filter(Boolean),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchRecipe(id: string): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from('recipes')
    .select(
      'id, name, photo_url, servings, prep_min, cook_min, tags, notes, is_favourite, created_by, updated_at, ' +
        'recipe_ingredients(id, ingredient_id, amount, unit, note, position, ingredients(name)), recipe_steps(position, text)',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(friendlyError(error));
  if (!data) return null;
  const { recipe_ingredients, recipe_steps, ...rest } = data as unknown as Row & {
    recipe_ingredients: { id: string; ingredient_id: string; amount: number | string | null; unit: string | null; note: string | null; position: number; ingredients: { name: string } | null }[];
    recipe_steps: { position: number; text: string }[];
  };
  return {
    ...(rest as Omit<Recipe, 'lines' | 'steps'>),
    lines: [...(recipe_ingredients ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((l) => ({
        id: l.id,
        ingredient_id: l.ingredient_id,
        name: l.ingredients?.name ?? '',
        // Postgres "numeric" can arrive as text, so turn it into a number.
        amount: l.amount == null ? null : Number(l.amount),
        unit: l.unit,
        note: l.note,
      })),
    steps: [...(recipe_steps ?? [])].sort((a, b) => a.position - b.position).map((s) => s.text),
  };
}

/** Saves a new or changed recipe and returns its id. */
export async function saveRecipe(input: RecipeInput): Promise<string> {
  const { data, error } = await supabase.rpc('save_recipe', { p_recipe: input });
  if (error) throw new Error(friendlyError(error));
  return data as string;
}

export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) throw new Error(friendlyError(error));
}

export async function setFavourite(id: string, isFavourite: boolean): Promise<void> {
  const { error } = await supabase.from('recipes').update({ is_favourite: isFavourite }).eq('id', id);
  if (error) throw new Error(friendlyError(error));
}

/** Ingredient suggestions while typing: built-in foods and your household's own. */
export async function searchIngredients(query: string): Promise<Ingredient[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase.rpc('search_ingredients', { p_query: query, p_limit: 5 });
  if (error) throw new Error(friendlyError(error));
  return (data ?? []) as Ingredient[];
}
