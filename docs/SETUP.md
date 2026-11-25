# Setting up Pantrio

This gets the app running on your phone, connected to your own Supabase database. It takes about 20 minutes the first time.

## What you need

- A computer with **Node.js 20 or newer** ([nodejs.org](https://nodejs.org), the LTS download).
- An Android phone with **Expo Go** installed from the Play Store.
- A free **Supabase** account ([supabase.com](https://supabase.com)).

## 1. Create the database (once)

1. In Supabase, click **New project**. Name it `pantrio`, choose **Central EU (Frankfurt)**, and set a database password. Keep the password somewhere safe.
2. When it's ready, open **SQL Editor › New query**.
3. Open [`supabase/migrations/20261125120000_init.sql`](../supabase/migrations/20261125120000_init.sql), copy the whole file, paste it into the editor, and press **Run**. You should see "Success. No rows returned".
4. Do the same with [`supabase/migrations/20261125140000_table_permissions.sql`](../supabase/migrations/20261125140000_table_permissions.sql). It lets signed-in people use the tables (newer Supabase projects don't allow it automatically).
5. Do the same with [`supabase/migrations/20261125150000_recipes_and_plan.sql`](../supabase/migrations/20261125150000_recipes_and_plan.sql). It adds what recipes and the meal plan need.
6. Do the same with [`supabase/seed.sql`](../supabase/seed.sql). This adds the built-in list of about 180 ingredients.
7. Optional, for easier family sign-up: **Authentication › Sign In / Providers › Email** → turn off **Confirm email**.

> **Why paste SQL?** The migration files create the tables, the security rules that keep your household's data private, and the functions the app calls. Run them in the order above, oldest first. Keeping them in the repo means the database can always be rebuilt exactly.

## 2. Connect the app to the database

1. In Supabase, click **Connect** (top of the page) or go to **Project Settings › API Keys**. Copy the **Project URL** and the **publishable key**. Older projects call it the **anon** key.
2. In the project folder, copy `.env.example` to a new file called `.env.local`, and paste in the two values:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://abcd1234.supabase.co
   EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_...
   ```

   `.env.local` is ignored by git, so it never ends up on GitHub. Never put the **secret** or **service_role** key in it.

## 3. Run the app on your phone

```bash
npm install        # once, and again whenever package.json changes
npx expo start     # starts the development server and shows a QR code
```

Open **Expo Go** on your phone and scan the QR code. Your phone and computer need to be on the same Wi-Fi. If they can't see each other, run `npx expo start --tunnel` instead.

When you save a file on the computer, the app on your phone reloads by itself.

## 4. Try it

1. Tap **Create an account** and sign up.
2. Tap **Start a new household**, give it a name, and tap **Create household**.
3. Tap your avatar (top right) to open **Household**. Tap **Share** to send the invite code to a family member.
4. On their phone: sign up, type the code under **Join your family**, and tap **Join household**. You'll both see each other under **Members** straight away.

## Checking the code

```bash
npm run typecheck   # TypeScript: catches type mistakes
npm run lint        # ESLint: catches common bugs and style problems
```
