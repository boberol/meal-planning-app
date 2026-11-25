-- =============================================================================
-- Pantrio fix: let signed-in people use the tables
--
-- Older Supabase projects automatically let signed-in people ("authenticated")
-- read and write every new table, and the security rules (row level security)
-- then decided which rows they could touch. Newer projects don't hand out that
-- access automatically, so without this file the app gets
-- "permission denied for table profiles" right after sign-in.
--
-- This is safe: the security rules in the Step 1 migration still limit each
-- person to their own household's rows, and signed-out visitors ("anon") still
-- get nothing. Households and profiles stay read-only here; renaming the
-- household and changing your own name or colour already have their own narrow
-- permissions in Step 1.
--
-- How to run it: Supabase › SQL Editor › New query › paste this file › Run.
-- (Run it after the Step 1 migration. Running it twice does no harm.)
-- =============================================================================

grant usage on schema public to authenticated;

-- The security rules call this to look up your household.
grant execute on function public.my_household_id() to authenticated;

grant select on public.households, public.profiles to authenticated;

grant select, insert, update, delete on
  public.ingredients,
  public.recipes,
  public.recipe_ingredients,
  public.recipe_steps,
  public.meal_plan_entries,
  public.pantry_items,
  public.grocery_items
to authenticated;
