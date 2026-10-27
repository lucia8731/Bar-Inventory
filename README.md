# Bar Inventory

A minimal inventory app for your bar, built with Next.js, TypeScript, a Python FastAPI backend, and PostgreSQL. Search a curated catalog, manage ingredients and recipes, and deduct stock when making cocktails.

## Features

- Browse 272 ingredients, search and filter by category, and add custom ingredients.
- Track quantities and low-stock thresholds in ml or pieces.
- Dashboard for stock and recipes.
- Create recipes and record drinks. A PostgreSQL transaction locks the relevant rows and rejects the entire operation if stock is insufficient.
- Google OAuth sign-in, profiles and server-enforced per-user data isolation.
- A Python validator generates the PostgreSQL catalog seed from CSV.

## Run locally

Requirements: Node.js 22, Python 3.10+, PostgreSQL, and Google OAuth credentials.

1. Create an empty PostgreSQL database, for example `bar_inventory`.
2. In Google Cloud, create an OAuth web application. Add `http://localhost:3000` as an authorized JavaScript origin and `http://localhost:3000/api/auth/callback` as an authorized redirect URI. Google OAuth consent screen setup is also required.
3. Copy `backend/.env.example` to `backend/.env` and fill in the database URL, Google credentials and a long random session secret. Do not commit this file. For example, generate a secret with `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
4. Install and start the API from the repository root:

   ```sh
   python -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   set -a; source backend/.env; set +a
   uvicorn backend.main:app --reload --port 8000
   ```

   The API creates its tables and validates/imports the catalog on startup. Use a fresh database; do not point it at a database containing unrelated tables.
5. In another terminal, copy `.env.example` to `.env.local`, run `npm install` and `npm run dev`, and open `http://localhost:3000`.
6. Sign in with Google. Add items from **Ingredients**, enter their quantities, then create cocktails using those items. Recipe amounts use the same units as the inventory item. An item used in a recipe cannot be deleted until it is removed from that recipe.

## Production setup

Run PostgreSQL and the Python service on private infrastructure. Set `DATABASE_URL`, `SESSION_SECRET`, `PUBLIC_APP_URL` (HTTPS origin without a trailing slash), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `APP_ENV=production` for the API. Set `BACKEND_URL` for Next.js to the private Python service URL; Next.js proxies `/api/*` so cookies and browser requests remain same-origin. Add the production origin and callback URL to Google OAuth. Use a strong unique session secret, HTTPS, database backups and deployment-specific network controls. The API should not be exposed directly to browsers.

## Validation

Run `python tools/generate_catalog.py` after editing `data/ingredients.csv`; it checks for missing values, valid units, duplicates and at least 200 rows. Run `python -m unittest discover -s tests -p 'test_catalog.py'`. API integration tests use a disposable PostgreSQL database and run in GitHub Actions. Never run them against a production database.
