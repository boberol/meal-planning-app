-- =============================================================================
-- Pantrio Step 2: recipes and the meal plan
--
-- Adds the database functions the recipe editor and the meal planner use,
-- and a storage bucket for recipe photos.
--
-- How to run it: Supabase › SQL Editor › New query › paste this file › Run.
-- (Run it once, after the Step 1 migration.)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Ingredient search and matching
--
-- These run as the person calling them ("security invoker"), so the normal
-- security rules apply: you only ever see the built-in list and your own
-- household's foods.
-- -----------------------------------------------------------------------------

-- Suggestions while typing an ingredient name. Best matches first:
-- exact name, then names starting with the text, then anything containing it
-- (including aliases, so "zucchini" finds Courgette).
create function public.search_ingredients(p_query text, p_limit integer default 8)
returns setof public.ingredients
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select lower(trim(p_query)) as text,
           '%' || replace(replace(replace(lower(trim(p_query)), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  )
  select i.*
    from public.ingredients i, q
   where q.text <> ''
     and (i.household_id is null or i.household_id = public.my_household_id())
     and (lower(i.name) like q.pattern
          or exists (select 1 from unnest(i.aliases) a where lower(a) like q.pattern))
   order by (lower(i.name) = q.text) desc,
            (q.text = any (select lower(a) from unnest(i.aliases) a)) desc,
            (lower(i.name) like q.text || '%') desc,
            (lower(i.name) like q.pattern) desc,
            char_length(i.name),
            i.name
   limit greatest(1, least(p_limit, 25));
$$;

-- Turns a typed name into an ingredient id: an existing food if the name or
-- one of its aliases matches (also "tomatoes" → Tomato), otherwise a new food
-- for this household.
create function public.find_or_create_ingredient(p_name text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  n text := lower(trim(coalesce(p_name, '')));
  hh uuid := public.my_household_id();
  found uuid;
begin
  if n = '' then
    raise exception 'Ingredient name is empty';
  end if;
  if hh is null then
    raise exception 'Join a household first';
  end if;

  -- 1. Exact name or alias.
  select i.id into found
    from public.ingredients i
   where (i.household_id is null or i.household_id = hh)
     and (lower(i.name) = n or n = any (select lower(a) from unnest(i.aliases) a))
   order by (lower(i.name) = n) desc, i.household_id nulls first
   limit 1;

  -- 2. Simple plurals: "tomatoes" → "tomato", "onion" → "onions".
  if found is null then
    select i.id into found
      from public.ingredients i
     where (i.household_id is null or i.household_id = hh)
       and (lower(i.name) in (regexp_replace(n, 'es$', ''), regexp_replace(n, 's$', ''))
            or lower(i.name) in (n || 's', n || 'es'))
     order by i.household_id nulls first
     limit 1;
  end if;

  -- 3. Nothing matched: remember it as one of this household's foods.
  --    (If someone else in the family added the same food a moment ago,
  --    use theirs instead of failing.)
  if found is null then
    insert into public.ingredients (household_id, name)
    values (hh, trim(p_name))
    on conflict (household_id, lower(name)) where household_id is not null do nothing
    returning id into found;
  end if;
  if found is null then
    select i.id into found
      from public.ingredients i
     where i.household_id = hh and lower(i.name) = n;
  end if;

  return found;
end;
$$;


-- -----------------------------------------------------------------------------
-- 2. Saving a recipe in one go
--
-- The editor sends the whole recipe (details, ingredient lines and steps) as
-- one JSON object. Saving it in a single database call means a recipe can
-- never end up half-saved if the connection drops.
--
-- Shape of p_recipe:
-- {
--   "id": "…" or null for a new recipe,
--   "name": "Chicken curry", "photo_url": "…", "servings": 4,
--   "prep_min": 15, "cook_min": 30, "tags": ["Dinner"], "notes": "…",
--   "ingredients": [{ "name": "Onion", "ingredient_id": null, "amount": 2, "unit": "piece", "note": "chopped" }],
--   "steps": ["Fry the onion.", "Add the chicken."]
-- }
-- -----------------------------------------------------------------------------

create function public.save_recipe(p_recipe jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  rid uuid := nullif(p_recipe ->> 'id', '')::uuid;
  hh uuid := public.my_household_id();
  tag_list text[] := coalesce(array(select jsonb_array_elements_text(coalesce(p_recipe -> 'tags', '[]'::jsonb))), '{}');
  line jsonb;
  pos integer := 0;
begin
  if hh is null then
    raise exception 'Join a household first';
  end if;
  if coalesce(trim(p_recipe ->> 'name'), '') = '' then
    raise exception 'Give the recipe a name';
  end if;

  if rid is null then
    insert into public.recipes (household_id, name, photo_url, servings, prep_min, cook_min, tags, notes, created_by)
    values (
      hh,
      trim(p_recipe ->> 'name'),
      nullif(p_recipe ->> 'photo_url', ''),
      coalesce((p_recipe ->> 'servings')::integer, 4),
      (p_recipe ->> 'prep_min')::integer,
      (p_recipe ->> 'cook_min')::integer,
      tag_list,
      nullif(trim(p_recipe ->> 'notes'), ''),
      auth.uid()
    )
    returning id into rid;
  else
    update public.recipes
       set name      = trim(p_recipe ->> 'name'),
           photo_url = nullif(p_recipe ->> 'photo_url', ''),
           servings  = coalesce((p_recipe ->> 'servings')::integer, 4),
           prep_min  = (p_recipe ->> 'prep_min')::integer,
           cook_min  = (p_recipe ->> 'cook_min')::integer,
           tags      = tag_list,
           notes     = nullif(trim(p_recipe ->> 'notes'), '')
     where id = rid;  -- the security rules make sure it's your household's recipe
    if not found then
      raise exception 'Recipe not found';
    end if;
    delete from public.recipe_ingredients where recipe_id = rid;
    delete from public.recipe_steps where recipe_id = rid;
  end if;

  -- Ingredient lines, in the order they were typed. Blank lines are skipped.
  for line in select value from jsonb_array_elements(coalesce(p_recipe -> 'ingredients', '[]'::jsonb))
  loop
    continue when coalesce(trim(line ->> 'name'), '') = '' and nullif(line ->> 'ingredient_id', '') is null;
    insert into public.recipe_ingredients (recipe_id, ingredient_id, amount, unit, note, position)
    values (
      rid,
      -- Use the chosen food if this household can see it, otherwise look the name up.
      coalesce(
        (select i.id from public.ingredients i where i.id = nullif(line ->> 'ingredient_id', '')::uuid),
        public.find_or_create_ingredient(line ->> 'name')
      ),
      nullif(line ->> 'amount', '')::numeric,
      nullif(trim(line ->> 'unit'), ''),
      nullif(trim(line ->> 'note'), ''),
      pos
    );
    pos := pos + 1;
  end loop;

  insert into public.recipe_steps (recipe_id, position, text)
  select rid, row_number() over (order by ord) - 1, trim(step)
    from jsonb_array_elements_text(coalesce(p_recipe -> 'steps', '[]'::jsonb)) with ordinality as s(step, ord)
   where trim(step) <> '';

  return rid;
end;
$$;


-- -----------------------------------------------------------------------------
-- 3. Meal plan: copy last week
--
-- Copies every meal from the week starting p_from_monday into the week
-- starting p_to_monday, skipping any slot on a day that already has a meal.
-- Returns how many meals were copied.
-- -----------------------------------------------------------------------------

create function public.copy_meal_plan_week(p_from_monday date, p_to_monday date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  hh uuid := public.my_household_id();
  copied integer;
begin
  if hh is null then
    raise exception 'Join a household first';
  end if;

  insert into public.meal_plan_entries (household_id, date, slot, recipe_id, free_text, servings, added_by)
  select hh, e.date + (p_to_monday - p_from_monday), e.slot, e.recipe_id, e.free_text, e.servings, auth.uid()
    from public.meal_plan_entries e
   where e.household_id = hh
     and e.date >= p_from_monday and e.date < p_from_monday + 7
     and not exists (
       select 1 from public.meal_plan_entries x
        where x.household_id = hh
          and x.date = e.date + (p_to_monday - p_from_monday)
          and x.slot = e.slot
     );
  get diagnostics copied = row_count;
  return copied;
end;
$$;


-- Only signed-in people may call these.
revoke execute on function public.search_ingredients(text, integer) from public, anon;
revoke execute on function public.find_or_create_ingredient(text) from public, anon;
revoke execute on function public.save_recipe(jsonb) from public, anon;
revoke execute on function public.copy_meal_plan_week(date, date) from public, anon;
grant execute on function public.search_ingredients(text, integer) to authenticated;
grant execute on function public.find_or_create_ingredient(text) to authenticated;
grant execute on function public.save_recipe(jsonb) to authenticated;
grant execute on function public.copy_meal_plan_week(date, date) to authenticated;


-- -----------------------------------------------------------------------------
-- 4. Recipe photos
--
-- Photos go in a storage bucket, in a folder named after the household:
--   recipe-photos/<household id>/<random id>.jpg
-- Only members can add or remove photos in their household's folder.
-- The bucket is "public" so photos load quickly without signing each link;
-- the random file names mean a photo can't be found without its link.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-photos', 'recipe-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Members can see household recipe photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = public.my_household_id()::text);

create policy "Members can add household recipe photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = public.my_household_id()::text);

create policy "Members can replace household recipe photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = public.my_household_id()::text);

create policy "Members can delete household recipe photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = public.my_household_id()::text);
