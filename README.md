# Pantrio

A meal planning app for the whole household. Plan the week's meals together, shop only for what you're missing, and cook from what's already at home. Everyone uses it on their own phone, and everything stays in sync.

> "Pantrio" is a working name.

**Status:** Steps 1 and 2 of 4 are done: accounts and households, then recipes and the weekly meal plan. See the [full plan](docs/PLAN.md).

## Getting started

Follow [docs/SETUP.md](docs/SETUP.md) to create the database and run the app on your phone with Expo Go.

## How it's built

| Piece | What it does |
|---|---|
| [Expo](https://expo.dev) + React Native + TypeScript | The phone app (Android first, iPhone from the same code later) |
| [Expo Router](https://docs.expo.dev/router/introduction/) | Navigation: every file in `src/app/` is a screen |
| [Supabase](https://supabase.com) | Database, sign-in, photo storage and live sync between family members' phones |
| [TanStack Query](https://tanstack.com/query) | Loads data, keeps a copy in memory, and reloads it when something changes |

## Where things are

```
src/
  app/                    screens (Expo Router: one file = one screen)
    _layout.tsx           root: fonts, sign-in state, which screens you can see
    (auth)/               welcome, sign up, sign in
    onboarding.tsx        create or join a household
    (tabs)/               the five tabs: Plan, Recipes, Cook, Groceries, Pantry
    recipe/[id].tsx       one recipe: servings, ingredients, steps
    recipe/edit.tsx       add or edit a recipe
    plan/meal.tsx         add, move or remove a planned meal
    household.tsx         invite code, members, sign out
  components/             reusable pieces: Button, TextField, ScreenHeader, WeekStrip…
  constants/theme.ts      colours, sizes and fonts from the design
  lib/
    supabase.ts           the database connection
    auth.tsx              who is signed in (useAuth)
    household.ts          create, join, leave, members
    query.tsx             loading and caching data (TanStack Query)
    sync.ts               live updates from other family members' phones
    recipes.ts            read, save and delete recipes
    mealPlan.ts           read and change the meal plan
    photos.ts             pick, shrink and upload recipe photos
    units.ts              units and amounts ("1/2", "0,5", "400 g")
supabase/
  migrations/             SQL that creates the tables and security rules
  seed.sql                the built-in ingredient list
docs/
  PLAN.md                 the full project plan
  SETUP.md                how to set up and run the app
```
