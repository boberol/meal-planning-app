# Meal Planning App: Full Project Plan

_Version 1 · 25 November 2026 · Prepared for Borys_

> **Working name:** "Pantrio" is a placeholder so the screens have something to show. You can rename it any time, and nothing in the code depends on the name.

---

## 1. What we are building

A phone app that helps a household decide what to eat, buy only what's missing, and keep track of what's already in the kitchen. Everyone in the family uses it on their own phone, and the recipes, meal plan, pantry and grocery list stay in sync between all of them.

**The core loop**

```
 Recipes ──► Meal plan ──► Grocery list ──► Shopping ──► Pantry
    ▲                                                     │
    └──────────── "What can I make?" ◄────────────────────┘
```

1. You save the recipes your family likes.
2. You put recipes on a weekly plan.
3. The app works out which ingredients you're missing and builds the grocery list.
4. You tick items off at the shop, and they go straight into the pantry.
5. When you cook a meal, its ingredients come out of the pantry.
6. When you don't know what to cook, the app suggests recipes based on what's in the pantry.

### Who it's for, in two phases

| Phase | Who uses it | Goal |
|---|---|---|
| **Phase 1: Family prototype** | You and your family | Something real you use every week. It doesn't need to be polished. |
| **Phase 2: Public app** | Anyone, through the Google Play Store | Polish it, add a paid subscription inside the app, and publish. |

This plan covers Phase 1 in detail. Phase 2 is outlined in section 8 so that the choices we make now keep that door open.

---

## 2. The technology, explained

You've done some coding, so here's what each piece is and why I picked it.

| Piece | What it is | Why we use it |
|---|---|---|
| **npm** | The package manager for JavaScript. It downloads the libraries the app uses. | You asked for it, and everything below installs through it. |
| **TypeScript** | JavaScript with types. You say "this is a number" or "this is a Recipe", and the editor warns you about mistakes before you run anything. | It catches a lot of bugs early, and it makes the code easier to read when you come back to it later. |
| **React Native** | A way to build real Android (and iOS) apps using React, the most popular way to build user interfaces in JavaScript. | One codebase gives you a real native app. It's widely used, so answers to most questions are easy to find. |
| **Expo** | A toolkit on top of React Native that handles the hard parts: building, running on your phone, the camera, notifications, and publishing to the Play Store. | You can run the app on your phone in seconds through the free **Expo Go** app, with no Android Studio setup. Later, **EAS Build** produces the file you upload to Google Play. |
| **Expo Router** | Navigation, meaning how you move between screens. Each screen is a file in an `app/` folder. | Simple to understand: the folder structure *is* the navigation. |
| **Supabase** | An online backend: a **PostgreSQL database**, **sign-in (Auth)**, **Realtime** (live updates pushed to phones) and **file storage** for recipe photos. | It gives us the household sync without writing our own server. The free tier is plenty for a family. It's built on standard Postgres, so we're never locked in. |
| **Row Level Security (RLS)** | Rules inside the database that say "a person can only see rows that belong to their household". | This is how we keep each family's data private, which matters once strangers use the app in Phase 2. |
| **TanStack Query** | A library that fetches data, caches it and keeps the screens up to date. | It makes the app feel fast and handles loading and error states for us. |

**How the pieces talk to each other**

```
 Your phone (Expo app)  ──┐
 Partner's phone        ──┼──►  Supabase (database + sign-in + realtime + photos)
 Kid's phone            ──┘          ▲
                                     └── every change is pushed live to the other phones
```

**Cost for Phase 1:** €0. Expo Go, the Supabase free tier and GitHub are all free. A Google Play developer account costs a one-time $25, and you only need it in Phase 2.

---

## 3. Every feature, explained

Each feature lists **what it does**, **how it works**, the **rules and edge cases**, and how we know it's **done**.

### 3.1 Accounts and sign-in

**What it does:** Each family member has their own account, so the app knows who they are and which household they belong to.

**How it works**
- Sign up and sign in with an email and password through Supabase Auth.
- "Forgot password" sends a reset email.
- You stay signed in after closing the app, because the session is saved securely on the phone.
- Your profile holds a display name and an optional colour or initial, which shows next to things you add or plan.

**Rules and edge cases**
- One account belongs to one household at a time, which keeps things simple for the prototype.
- Sign in with Google can come in Phase 2. It matters more for the public release.

**Done when:** a new person can sign up, close the app, open it again, and still be signed in.

---

### 3.2 Households (sharing with your family)

**What it does:** A household is the shared space. Everything (recipes, meal plan, pantry and grocery list) belongs to the household, not to one person.

**How it works**
- After the first sign-up, the app asks you to **Create a household** (for example "The Kowalski home") or **Join a household**.
- Creating one gives you a short **invite code**, like `PLUM-4821`, which you can share by text or WhatsApp straight from the app.
- A family member signs up, taps **Join a household**, and types the code.
- The Household screen lists the members, shows the code, and lets the owner make a new code (which turns off the old one) or remove a member.

**Roles**
- **Owner:** the person who created the household. They can remove members and change the code.
- **Member:** can do everything else, including adding recipes, planning meals and ticking groceries.

**How the sync works, in simple terms:** every phone listens to the household's data through Supabase Realtime. When someone changes anything, the database tells every other phone in the household, and those phones refresh just that piece. In practice that takes about a second.

**Rules and edge cases**
- An invite code expires after 7 days, so an old screenshot can't be used forever.
- If the owner leaves, ownership passes to the member who has been in the household the longest.
- If two people edit the same thing at once, the last save wins. That's fine for a family. We'd only revisit it if it causes real problems.

**Done when:** two phones signed in to the same household both see a recipe appear within a couple of seconds of one person adding it.

---

### 3.3 Recipes

**What it does:** The household's cookbook. It's where everything else starts.

**How it works**

*Recipe list screen*
- Cards with photo, name, total time and number of servings.
- A badge on each card shows how many of its ingredients you already have, for example "6 of 8 in pantry".
- **Search** by name or ingredient. Typing "chicken" finds every recipe that uses chicken.
- **Filter chips**: Breakfast, Lunch, Dinner, Snack, Quick (under 30 minutes), Vegetarian, Favourites.
- A ♥ button marks a recipe as a family favourite.

*Recipe detail screen*
- Photo, name, time, servings and tags.
- **Servings stepper (– 4 +)**: changing it scales every ingredient amount, so 200 g for 4 people becomes 300 g for 6.
- **Ingredients list**, where each line shows ✓ **Have** or **Missing** based on the pantry.
- **Steps**, numbered.
- Buttons: **Add to meal plan**, **Add missing to groceries**, **Mark as cooked**, plus Edit and Delete in the menu.

*Add / edit recipe screen*
- Name, photo (camera or gallery), servings, prep time and cook time.
- Tags, picked from chips.
- **Ingredients**: each line has an amount, a unit (g, kg, ml, l, tsp, tbsp, cup, piece) and the ingredient name. The name field suggests ingredients you've used before, which keeps names consistent (see 3.8).
- **Steps**: one text box per step, which you can reorder by dragging.
- Notes, for example "Grandma's version: add more garlic".

**Rules and edge cases**
- A recipe needs at least a name. Everything else is optional, so a quick idea can be saved in seconds.
- Deleting a recipe that is on the meal plan asks first, then removes it from the plan too.
- Photos are resized on the phone before upload, so they're fast to load and don't fill up storage.

**Later (not in the prototype):** import a recipe from a website link, and nutrition and calories.

**Done when:** you can add a recipe with a photo, ingredients and steps, find it by searching, and scale it to a different number of servings.

---

### 3.4 Meal plan

**What it does:** A weekly calendar of what the family will eat.

**How it works**
- A **week view**: a strip at the top to switch days (Mon to Sun), plus arrows to move between weeks.
- Each day has slots: **Breakfast, Lunch, Dinner, Snack**.
- Tap an empty slot, **Add a meal**, and pick a recipe from a searchable list. Your favourites and the meals you can make right now are shown first.
- Each planned meal shows its photo, its name, its servings (which you can change for just that meal), who added it, and whether everything is in the pantry.
- You can also add a **free-text meal** with no recipe, like "Eating out" or "Leftovers", so the plan stays honest but no ingredients are needed.
- **Copy last week**, for families who repeat their favourite weeks.
- **Mark as cooked**: tapping it on a planned meal takes the ingredients out of the pantry (see 3.5).

**Rules and edge cases**
- The week starts on Monday, and you can change that in Settings.
- Past days stay visible but greyed out, which is useful for remembering what you ate.
- The same recipe can appear several times in a week.

**Done when:** you can plan a full week, see it on a second phone, and move a meal to a different day.

---

### 3.5 Pantry and fridge

**What it does:** A list of what's in your kitchen right now. It drives both the grocery list and the suggestions, so it's the heart of the "smart" features.

**How it works**
- Three tabs: **Fridge, Pantry and Freezer**, plus All.
- Each item has a name, an amount and unit (for example 1 l of milk or 6 eggs), and an **optional use-by date**.
- **Quick add**: a text box at the top. Type "eggs 6" and press add. A suggestion list appears while you type.
- Swipe an item to **Use it up** (remove it) or edit it. Tap + or − to adjust the amount.
- A **"Use soon"** section at the top shows items within 3 days of their use-by date, so food doesn't go to waste.
- **Staples:** items like salt, oil and pepper can be marked as "always have". They never go on the grocery list and always count as available, so you don't have to track every pinch of salt.

**How the pantry changes automatically**
- **After shopping:** ticked grocery items are added (see 3.6).
- **After cooking:** "Mark as cooked" subtracts the recipe's amounts. If the result would go below zero, the item just goes to zero. Because the app can't know exact amounts in real life, a small banner says "Removed 5 items from the pantry · Undo".

**Rules and edge cases**
- The same ingredient bought twice is **merged**: 500 g of rice plus 1 kg of rice becomes 1.5 kg.
- If the units don't match and can't be converted (for example "1 bag" against "500 g"), it keeps both lines rather than guessing.

**Done when:** the pantry updates by itself after a shopping trip and after cooking, and both phones see the same pantry.

---

### 3.6 Grocery list

**What it does:** It builds your shopping list from the meal plan, lists only what you don't already have, and lets the family shop together.

**How it works**

*Building the list*
1. Tap **Build from meal plan** and choose the days, which default to the rest of this week.
2. The app adds up every ingredient across the planned meals, scaled to each meal's servings. Two recipes that each need 2 onions mean 4 onions.
3. It **subtracts what's in the pantry**. If you need 4 onions and have 1, it adds 3 onions to the list.
4. It skips staples.
5. It groups the list by **shop aisle**: Fruit & veg, Dairy & eggs, Meat & fish, Bakery, Pantry, Frozen, Drinks, Household and Other.
6. Each line shows which meals need it ("for Chicken curry, Tacos"), so you know whether you can skip it.

*Shopping*
- Tap an item to **tick it off**. It moves to the bottom with a strikethrough.
- **Live**: if your partner ticks off milk in another aisle, it ticks off on your phone too. You can split up in the shop.
- **Add an item by hand** (for example "birthday candles"). Hand-added items can be anything, not just food.
- When you're done, tap **Finish shopping**: every ticked food item goes into the pantry, ticked items leave the list, and anything unticked stays for next time.

**Rules and edge cases**
- Rebuilding the list doesn't delete items you added by hand or items you've already ticked.
- If the plan changes after the list was built, a banner says "Your meal plan changed · Update list".
- If an amount is tiny compared to the pack size, it still lists the item. Packs come in later (see section 8).

**Done when:** you plan 3 dinners, build the list, and see only the missing items, grouped by aisle. Ticking items on one phone shows on the other, and Finish shopping puts them in the pantry.

---

### 3.7 "What can I make?" (suggestions)

**What it does:** It answers "what's for dinner?" using only what's already in the kitchen.

**How it works**
- For every recipe, the app compares its ingredients with the pantry and works out a **match**: how many ingredients you have out of how many the recipe needs. Staples always count as "have".
- Results are shown in three groups:
  1. **Ready to cook**: you have everything.
  2. **Missing 1 or 2**: shows exactly what's missing, with **Add to groceries** right there.
  3. **Worth a shop**: you have more than half.
- **Use it up**: recipes that use items close to their use-by date get a "Uses spinach before it goes off" label and appear first within their group.
- Filters: meal type, time ("Under 30 min"), and favourites only.
- From any suggestion: **Cook now** (marks it cooked and updates the pantry) or **Add to meal plan**.

**How the matching works:** in the prototype it's a simple, honest count, done on the phone. Phase 2 could add smarter ranking, such as variety (not suggesting pasta four days in a row) or AI-generated recipe ideas from your pantry.

**Rules and edge cases**
- An ingredient counts as "have" if the pantry has *any* amount of it. Checking the amount too ("you need 500 g, you have 200 g") is a good next improvement, and section 3.8 makes it possible.

**Done when:** you add a few things to the pantry and the app correctly shows which saved recipes you can make now and what the others are missing.

---

### 3.8 Ingredients and units (the hidden part that makes everything work)

This feature isn't a screen, but the grocery list, pantry and suggestions all depend on it, so it's worth understanding.

**The problem:** a recipe says "2 tomatoes", the pantry says "Tomato x3", and the grocery list says "tomatoes". To the app these are three different strings unless we connect them.

**The solution: a shared ingredient catalogue**
- One `ingredients` table holds each food once: name, aisle (category) and a default unit.
- The app comes with about 300 common ingredients built in (vegetables, dairy, meat, spices and so on), each with an aisle.
- Recipe lines, pantry items and grocery items all **point to an ingredient**, not to free text. When you type "tomatos" the suggestion list offers "Tomato", and choosing it links everything together.
- New ingredients you type are added to your household's catalogue automatically, so the app learns your family's foods ("Babcia's pierogi dough").
- Simple plural and alias handling: "tomato" and "tomatoes" are the same, and so are "spring onion" and "scallion".

**Units**
- Units are converted within the same kind: g ↔ kg, ml ↔ l, tsp ↔ tbsp.
- "Piece" is its own unit (eggs, onions).
- If units can't be compared, the app doesn't guess. It keeps them separate and lets you sort it out.

**Done when:** an ingredient typed three slightly different ways ends up as one item on the grocery list.

---

### 3.9 Settings and profile

- Your name and colour.
- Household: members, invite code, leave household.
- Week starts on: Monday or Sunday.
- Default servings for new recipes.
- Manage staples (always-have items).
- Units: metric only for the prototype.
- Sign out.

---

## 4. Screens and navigation

**Bottom tab bar (5 tabs)**

| Tab | Screen | Main actions |
|---|---|---|
| **Plan** | Week view | Add a meal, mark as cooked |
| **Recipes** | Recipe list → Recipe detail → Add/Edit | Search, add a recipe |
| **Cook** | "What can I make?" | Cook now, add missing items to groceries |
| **Groceries** | Grocery list | Build from plan, tick off, finish shopping |
| **Pantry** | Fridge / Pantry / Freezer | Quick add, use it up |

**Other screens:** Welcome → Sign up / Sign in → Create or join a household → Household & settings (opened from your avatar, top right).

The designs for these screens are in the design canvas that goes with this plan.

---

## 5. The data (how it's stored)

These are the tables in the Supabase database. Every table except `profiles` has a `household_id`, and the Row Level Security rules allow you to read and write only rows from your own household.

| Table | What one row is | Key columns |
|---|---|---|
| `profiles` | A person | id, display_name, colour, household_id |
| `households` | A family | id, name, owner_id, invite_code, invite_expires_at |
| `ingredients` | One food | id, name, aliases, aisle, default_unit, household_id (empty for the built-in ones) |
| `recipes` | A recipe | id, household_id, name, photo_url, servings, prep_min, cook_min, tags, notes, is_favourite, created_by |
| `recipe_ingredients` | One line of a recipe | recipe_id, ingredient_id, amount, unit, note ("finely chopped") |
| `recipe_steps` | One step | recipe_id, position, text |
| `meal_plan_entries` | One planned meal | household_id, date, slot (breakfast/lunch/dinner/snack), recipe_id *or* free_text, servings, cooked_at, added_by |
| `pantry_items` | Something you have | household_id, ingredient_id, amount, unit, location (fridge/pantry/freezer), use_by, is_staple |
| `grocery_items` | A line on the list | household_id, ingredient_id *or* free_text, amount, unit, aisle, for_recipes, is_checked, checked_by, added_manually |

---

## 6. How the code is organised

```
meal-planning-app/
├── app/                      ← screens (Expo Router: one file = one screen)
│   ├── (auth)/               ← welcome, sign-in, sign-up, join household
│   ├── (tabs)/               ← the 5 tabs
│   │   ├── plan.tsx
│   │   ├── recipes/
│   │   ├── cook.tsx
│   │   ├── groceries.tsx
│   │   └── pantry.tsx
│   └── settings.tsx
├── components/               ← reusable pieces: RecipeCard, IngredientRow, Button…
├── lib/
│   ├── supabase.ts           ← the connection to Supabase
│   ├── grocery.ts            ← "build list from plan minus pantry" logic
│   ├── suggestions.ts        ← "what can I make" matching logic
│   └── units.ts              ← unit conversions
├── supabase/
│   ├── migrations/           ← SQL that creates the tables and security rules
│   └── seed.sql              ← the ~300 built-in ingredients
├── docs/PLAN.md              ← this plan
└── package.json              ← the list of npm packages
```

The **smart logic** (grocery maths, suggestions and units) lives in plain TypeScript files in `lib/`, separate from the screens. That makes it easy to test, and easy to read without knowing React.

---

## 7. Build steps

Each step ends with something you can try on your phone. Each step is a **pull request** on GitHub, so you can see exactly what changed, and I'll write a plain-language explanation with each one.

### Step 0: Accounts (you, about 15 minutes)
- [ ] Create a free account at supabase.com and a new project (I'll give you exact clicks).
- [ ] Install **Expo Go** from the Play Store on your phone.
- [ ] Give me write access to the GitHub repo, so I can open pull requests.

### Step 1: Foundation, sign-in and households
- [ ] Create the Expo + TypeScript project, with the 5 tabs (empty screens) and the design's colours and fonts.
- [ ] Database: tables, security rules, and the built-in ingredient list.
- [ ] Sign up, sign in, sign out.
- [ ] Create a household, the invite code, and joining with a code.
- **Try it:** you and a family member each sign up and end up in the same household.

### Step 2: Recipes and the meal plan
- [ ] Recipe list, search and filters.
- [ ] Add/edit recipe with photo, ingredients (with ingredient suggestions) and steps.
- [ ] Recipe detail with the servings scaler.
- [ ] Week view meal plan: add a meal, change servings, free-text meals, copy last week.
- [ ] Live sync for recipes and the plan.
- **Try it:** add 5 family recipes and plan next week. Watch it appear on the other phone.

### Step 3: Pantry and grocery list
- [ ] Pantry with Fridge/Pantry/Freezer, quick add, use-by dates and staples.
- [ ] Build the grocery list from the plan minus the pantry, grouped by aisle.
- [ ] Ticking items off with live sync, hand-added items, and Finish shopping → pantry.
- [ ] Mark as cooked → subtract from pantry, with Undo.
- **Try it:** do a real weekly shop with the app, splitting the list with someone.

### Step 4: "What can I make?" and the family test
- [ ] Matching logic with Ready / Missing 1–2 / Worth a shop groups.
- [ ] "Use it up" priority for items close to their use-by date.
- [ ] Have / Missing badges on recipe cards and recipe detail.
- [ ] Polish: empty states, loading states, error messages.
- [ ] **Family test week:** everyone uses it for a week, and we collect a list of what to fix and what to add.

---

## 8. Phase 2: Getting to the Play Store (later)

Not part of the prototype. Listed so we don't block it by accident.

**Publishing**
- Google Play developer account ($25, one time).
- App icon, screenshots, store description and privacy policy (needed because we store accounts).
- Build with **EAS Build**, then test with friends through Google Play's internal testing before going public.

**Subscription (making money)**
- In-app subscriptions through **Google Play Billing**, most easily handled with **RevenueCat**, a service that manages subscriptions and has an Expo library.
- A possible split (to decide later):
  - **Free:** up to 25 recipes, one week of planning, grocery list and pantry.
  - **Premium (monthly or yearly):** unlimited recipes, plans further ahead, "What can I make?", recipe import from links, nutrition, more household members.

**Feature ideas for later**
- Import a recipe from a website link.
- Barcode scanning to add pantry items.
- Nutrition and calories per meal.
- Reminders, like "Take the chicken out of the freezer" or "Shopping list ready".
- Pack sizes on the grocery list ("Milk: 1 l carton").
- AI recipe ideas from what's in the pantry.
- An iPhone version (Expo builds it from the same code).
- Polish language support.

---

## 9. Risks and open questions

| Topic | Risk | What we'll do |
|---|---|---|
| Ingredient matching | Messy names break the grocery list and suggestions | The ingredient catalogue and suggestions from 3.8, from day one |
| Pantry accuracy | People forget to update it, so suggestions get worse | Automatic updates after shopping and cooking, staples, and "Use soon" reminders |
| Offline in the shop | Weak signal in the supermarket | The grocery list is cached on the phone, and ticks sync when the signal is back (Step 3) |
| Supabase free tier | Pauses after a week with no activity | Normal family use keeps it active. The paid plan is only needed in Phase 2 |

**Questions for you (no rush)**
1. A real name for the app?
2. Should the app be in English, Polish or both from the start?
3. Any family recipes you want me to add as starter data, so it isn't empty on day one?

---

## 10. Glossary

- **Backend:** the part that runs on a server (here Supabase) and stores shared data.
- **Database table:** like a spreadsheet tab. Each row is one thing (one recipe) and each column is one fact about it (its name).
- **Migration:** a SQL file that creates or changes tables. It's kept in the repo so the database can be rebuilt exactly.
- **Realtime:** the database pushes changes to phones the moment they happen, instead of phones asking "anything new?" over and over.
- **Pull request (PR):** a proposed change on GitHub that you can read and approve before it becomes part of the main code.
- **Component:** a reusable piece of the screen, like a recipe card, written once and used in many places.
- **Expo Go:** a free app that runs your project on your phone during development, without installing a full build.
