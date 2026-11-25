-- =============================================================================
-- Pantrio: first database setup
--
-- Creates every table from the plan, the security rules that keep each
-- household's data private, and the functions the app calls to create and
-- join households.
--
-- How to run it: open your Supabase project › SQL Editor › New query, paste
-- this whole file, and press Run. Then do the same with supabase/seed.sql.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Lists of allowed values
-- -----------------------------------------------------------------------------

create type public.meal_slot as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type public.storage_location as enum ('fridge', 'pantry', 'freezer');
create type public.aisle as enum (
  'fruit_veg', 'dairy_eggs', 'meat_fish', 'bakery', 'pantry', 'frozen', 'drinks', 'household', 'other'
);


-- -----------------------------------------------------------------------------
-- 2. Households and people
-- -----------------------------------------------------------------------------

-- A family. Everything else belongs to a household.
create table public.households (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(trim(name)) between 1 and 60),
  owner_id          uuid references auth.users (id) on delete set null,
  invite_code       text unique,
  invite_expires_at timestamptz,
  created_at        timestamptz not null default now()
);

-- One row per person, created automatically when they sign up (see section 6).
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  display_name        text not null default '' check (char_length(display_name) <= 60),
  color               text not null default '#1E6F47' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  household_id        uuid references public.households (id) on delete set null,
  joined_household_at timestamptz,
  created_at          timestamptz not null default now()
);

create index profiles_household_idx on public.profiles (household_id);


-- -----------------------------------------------------------------------------
-- 3. Food: the ingredient catalogue, recipes, plan, pantry and groceries
-- -----------------------------------------------------------------------------

-- Each food once. household_id is empty for the built-in list (supabase/seed.sql)
-- and set for foods a household adds itself.
create table public.ingredients (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid references public.households (id) on delete cascade,
  name         text not null check (char_length(trim(name)) between 1 and 80),
  aliases      text[] not null default '{}',
  aisle        public.aisle not null default 'other',
  default_unit text not null default 'piece',
  created_at   timestamptz not null default now()
);

create unique index ingredients_builtin_name_idx on public.ingredients (lower(name)) where household_id is null;
create unique index ingredients_household_name_idx on public.ingredients (household_id, lower(name)) where household_id is not null;

create table public.recipes (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name         text not null check (char_length(trim(name)) between 1 and 120),
  photo_url    text,
  servings     integer not null default 4 check (servings between 1 and 50),
  prep_min     integer check (prep_min >= 0),
  cook_min     integer check (cook_min >= 0),
  tags         text[] not null default '{}',
  notes        text,
  is_favourite boolean not null default false,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index recipes_household_idx on public.recipes (household_id);

-- One line of a recipe, like "400 g spaghetti".
create table public.recipe_ingredients (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references public.recipes (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete restrict,
  amount        numeric check (amount >= 0),
  unit          text,
  note          text,
  position      integer not null default 0
);

create index recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id);

create table public.recipe_steps (
  id        uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position  integer not null,
  text      text not null
);

create index recipe_steps_recipe_idx on public.recipe_steps (recipe_id);

-- One planned meal. Either a recipe, or free text like "Eating out".
create table public.meal_plan_entries (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  date         date not null,
  slot         public.meal_slot not null,
  recipe_id    uuid references public.recipes (id) on delete cascade,
  free_text    text,
  servings     integer check (servings between 1 and 50),
  cooked_at    timestamptz,
  added_by     uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  check (recipe_id is not null or free_text is not null)
);

create index meal_plan_household_date_idx on public.meal_plan_entries (household_id, date);

create table public.pantry_items (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete restrict,
  amount        numeric check (amount >= 0),
  unit          text,
  location      public.storage_location not null default 'pantry',
  use_by        date,
  is_staple     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index pantry_items_household_idx on public.pantry_items (household_id);

-- One line on the shopping list. Either a known ingredient or free text.
create table public.grocery_items (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households (id) on delete cascade,
  ingredient_id  uuid references public.ingredients (id) on delete set null,
  free_text      text,
  amount         numeric check (amount >= 0),
  unit           text,
  aisle          public.aisle not null default 'other',
  for_recipes    text[] not null default '{}',
  is_checked     boolean not null default false,
  checked_by     uuid references public.profiles (id) on delete set null,
  added_manually boolean not null default false,
  created_at     timestamptz not null default now(),
  check (ingredient_id is not null or free_text is not null)
);

create index grocery_items_household_idx on public.grocery_items (household_id);


-- -----------------------------------------------------------------------------
-- 4. Helper: which household am I in?
--
-- "security definer" lets this read profiles without tripping over the
-- profiles security rule (which itself uses this function).
-- -----------------------------------------------------------------------------

create function public.my_household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select household_id from public.profiles where id = auth.uid()
$$;


-- -----------------------------------------------------------------------------
-- 5. Security rules (Row Level Security)
--
-- With RLS on, a table returns nothing unless a policy allows it. The rule is
-- simple: you can see and change rows that belong to your own household.
-- -----------------------------------------------------------------------------

alter table public.households         enable row level security;
alter table public.profiles           enable row level security;
alter table public.ingredients        enable row level security;
alter table public.recipes            enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps       enable row level security;
alter table public.meal_plan_entries  enable row level security;
alter table public.pantry_items       enable row level security;
alter table public.grocery_items      enable row level security;

-- Households: members can see their own. Only the owner can rename it.
-- Creating, joining and leaving go through the functions in section 7.
create policy "Members can see their household"
  on public.households for select to authenticated
  using (id = public.my_household_id());

create policy "Owner can rename the household"
  on public.households for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

revoke insert, update, delete on public.households from anon, authenticated;
grant update (name) on public.households to authenticated;

-- Profiles: you can see yourself and the people in your household.
-- You can change your own name and colour, but not which household you're in.
create policy "See yourself and your household"
  on public.profiles for select to authenticated
  using (id = auth.uid() or (household_id is not null and household_id = public.my_household_id()));

create policy "Update your own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, color) on public.profiles to authenticated;

-- Ingredients: everyone sees the built-in list; households manage their own additions.
create policy "See built-in and household ingredients"
  on public.ingredients for select to authenticated
  using (household_id is null or household_id = public.my_household_id());

create policy "Add household ingredients"
  on public.ingredients for insert to authenticated
  with check (household_id = public.my_household_id());

create policy "Change household ingredients"
  on public.ingredients for update to authenticated
  using (household_id = public.my_household_id())
  with check (household_id = public.my_household_id());

create policy "Delete household ingredients"
  on public.ingredients for delete to authenticated
  using (household_id = public.my_household_id());

-- Tables that carry household_id directly: full access to your own household's rows.
create policy "Household recipes"
  on public.recipes for all to authenticated
  using (household_id = public.my_household_id())
  with check (household_id = public.my_household_id());

create policy "Household meal plan"
  on public.meal_plan_entries for all to authenticated
  using (household_id = public.my_household_id())
  with check (household_id = public.my_household_id());

create policy "Household pantry"
  on public.pantry_items for all to authenticated
  using (household_id = public.my_household_id())
  with check (household_id = public.my_household_id());

create policy "Household groceries"
  on public.grocery_items for all to authenticated
  using (household_id = public.my_household_id())
  with check (household_id = public.my_household_id());

-- Recipe lines and steps belong to a recipe, so check the recipe's household.
create policy "Household recipe ingredients"
  on public.recipe_ingredients for all to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.household_id = public.my_household_id()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.household_id = public.my_household_id()));

create policy "Household recipe steps"
  on public.recipe_steps for all to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.household_id = public.my_household_id()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.household_id = public.my_household_id()));

-- Nothing is readable without signing in.
revoke all on all tables in schema public from anon;


-- -----------------------------------------------------------------------------
-- 6. Create a profile automatically for every new account
-- -----------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 60)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- 7. Household functions the app calls
--
-- These run with extra rights ("security definer") but check everything
-- themselves first, so they're the only safe way in or out of a household.
-- -----------------------------------------------------------------------------

-- Makes a code like PLUM-4821 that no other household is using.
create function public.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  words text[] := array[
    'PLUM', 'PEAR', 'FIG', 'KIWI', 'LIME', 'LEEK', 'BEAN', 'CORN', 'RICE', 'OAT',
    'MINT', 'SAGE', 'DILL', 'CHIVE', 'BASIL', 'APPLE', 'MANGO', 'PEACH', 'OLIVE', 'ONION',
    'BERRY', 'LEMON', 'MELON', 'GRAPE', 'HONEY', 'PASTA', 'BREAD', 'TOAST', 'SPICE', 'CUMIN'
  ];
  candidate text;
begin
  loop
    candidate := words[1 + floor(random() * array_length(words, 1))::int]
                 || '-' || lpad(floor(random() * 10000)::int::text, 4, '0');
    exit when not exists (select 1 from public.households where invite_code = candidate);
  end loop;
  return candidate;
end;
$$;

-- Start a new household and become its owner.
create function public.create_household(p_name text)
returns public.households
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.households;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  if (select household_id from public.profiles where id = auth.uid()) is not null then
    raise exception 'You are already in a household';
  end if;

  insert into public.households (name, owner_id, invite_code, invite_expires_at)
  values (trim(p_name), auth.uid(), public.generate_invite_code(), now() + interval '7 days')
  returning * into result;

  update public.profiles
     set household_id = result.id, joined_household_at = now()
   where id = auth.uid();

  return result;
end;
$$;

-- Join a household with its invite code. Spaces and lower case are tidied up.
create function public.join_household(p_code text)
returns public.households
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.households;
  cleaned text;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  if (select household_id from public.profiles where id = auth.uid()) is not null then
    raise exception 'You are already in a household';
  end if;

  cleaned := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  cleaned := regexp_replace(cleaned, '^([A-Z]+)([0-9]+)$', '\1-\2');

  select * into target
    from public.households
   where invite_code = cleaned
     and invite_expires_at > now();

  if target.id is null then
    raise exception 'Invite code not found or expired';
  end if;

  update public.profiles
     set household_id = target.id, joined_household_at = now()
   where id = auth.uid();

  return target;
end;
$$;

-- Owner only: replace the invite code (the old one stops working) for another 7 days.
create function public.regenerate_invite_code()
returns public.households
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.households;
begin
  update public.households
     set invite_code = public.generate_invite_code(),
         invite_expires_at = now() + interval '7 days'
   where id = public.my_household_id()
     and owner_id = auth.uid()
  returning * into result;

  if result.id is null then
    raise exception 'Only the owner can make a new invite code';
  end if;
  return result;
end;
$$;

-- Leave your household. An owner hands over to the longest-standing member;
-- the last person out deletes the household and everything in it.
create function public.leave_household()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hh_id uuid := public.my_household_id();
  next_owner uuid;
begin
  if hh_id is null then
    return;
  end if;

  update public.profiles
     set household_id = null, joined_household_at = null
   where id = auth.uid();

  select id into next_owner
    from public.profiles
   where household_id = hh_id
   order by joined_household_at asc nulls last
   limit 1;

  if next_owner is null then
    delete from public.households where id = hh_id;
  else
    update public.households
       set owner_id = next_owner
     where id = hh_id and (owner_id = auth.uid() or owner_id is null);
  end if;
end;
$$;

-- Owner only: remove someone else from the household.
create function public.remove_member(p_member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.households where id = public.my_household_id() and owner_id = auth.uid()
  ) then
    raise exception 'Only the owner can remove members';
  end if;
  if p_member = auth.uid() then
    raise exception 'Use Leave household to remove yourself';
  end if;

  update public.profiles
     set household_id = null, joined_household_at = null
   where id = p_member
     and household_id = public.my_household_id();
end;
$$;

-- Only signed-in people may call these; nobody may call the internal helper.
revoke execute on function public.generate_invite_code() from public, anon, authenticated;
revoke execute on function public.create_household(text) from public, anon;
revoke execute on function public.join_household(text) from public, anon;
revoke execute on function public.regenerate_invite_code() from public, anon;
revoke execute on function public.leave_household() from public, anon;
revoke execute on function public.remove_member(uuid) from public, anon;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.regenerate_invite_code() to authenticated;
grant execute on function public.leave_household() to authenticated;
grant execute on function public.remove_member(uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- 8. Keep updated_at current
-- -----------------------------------------------------------------------------

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger recipes_touch before update on public.recipes
  for each row execute function public.touch_updated_at();
create trigger pantry_items_touch before update on public.pantry_items
  for each row execute function public.touch_updated_at();


-- -----------------------------------------------------------------------------
-- 9. Live updates
--
-- Adding a table to this publication makes Supabase push its changes to
-- every phone that's listening. The security rules above still apply.
-- -----------------------------------------------------------------------------

alter publication supabase_realtime add table
  public.profiles,
  public.households,
  public.recipes,
  public.recipe_ingredients,
  public.recipe_steps,
  public.meal_plan_entries,
  public.pantry_items,
  public.grocery_items;
