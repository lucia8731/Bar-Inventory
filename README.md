# Bar Inventory

A simple bar inventory app built with Next.js, TypeScript, Supabase and Python. Browse a curated catalog, manage stock, save recipes and deduct ingredients when you make cocktails.

## Features

- Browse 272 default ingredients, search by name and filter by category.
- Add ingredients from the catalog or create your own; record stock and a low-stock threshold in ml or pieces.
- Dashboard shows inventory, low-stock items and cocktail counts.
- Create cocktails and recipes using items in your inventory. Making a cocktail deducts its ingredients in a single database transaction; insufficient stock prevents the deduction.
- Google sign-in, individual profiles and per-user data isolation using Supabase Row Level Security.
- Python validates the ingredient CSV and produces the SQL seed file.

## Setup

1. Create a Supabase project. In its SQL Editor, run `supabase/schema.sql`, then `supabase/seed.sql`. These scripts are intended for a **new, empty project** and will create tables and policies. Do not run them over an existing database without reviewing a migration first.
2. Enable the Google provider in Supabase Authentication and configure its Google OAuth client. Add your app URL (for local use, `http://localhost:3000`) to Supabase Auth URL Configuration as an allowed redirect URL; configure the Google provider callback URL shown by Supabase in your Google Cloud OAuth client.
3. Copy `.env.example` to `.env.local`. Set the project URL and publishable/anon key from Supabase. Do not use a service-role key in the browser.
4. Install dependencies with `npm install`, then run `npm run dev` and open `http://localhost:3000`.
5. Sign in with Google and browse **Ingredients**. Add items to your inventory, enter their current quantities and low-stock thresholds, then create cocktails using those items.

Use the same unit for each ingredient's stock and the amount in a recipe. Removing an ingredient used in a recipe is blocked until it is removed from the recipe. This helps avoid accidentally losing recipe data.

## Catalog maintenance

Edit `data/ingredients.csv`, then run `python3 tools/generate_catalog.py`. The script checks column names, missing fields, valid units, duplicates and the minimum catalog size; it writes `supabase/seed.sql`. Run the generated seed in Supabase to update the shared catalog. Run the Python tests with `python3 -m unittest discover -s tests`.

## Deployment

Set the same public environment variables in your hosting provider and add the deployed URL to the Supabase Auth redirect allowlist. A working Supabase project and a configured Google OAuth provider are required; the app displays a setup message when environment variables are missing.
