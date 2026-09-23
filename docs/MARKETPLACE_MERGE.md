# Merging with MealLensAI (healthassistant)

## Architecture

- **Main app** (`../healthassistant`): single Supabase signup, meal planning, ingredient scan, enterprise org tools.
- **Marketplace** (this repo): patient discovery, messaging, video calls, appointments, dietitian credentialing.
- **Enterprise meal plans / invites** stay in the main app — only marketplace surfaces are added to org sidebars.

## Local full stack

1. Main Flask API — port `5001` (see healthassistant backend).
2. Marketplace FastAPI — `cd backend && python run.py` (port `8000`).
3. Marketplace UI — `VITE_BASE_PATH=/care/ VITE_EMBEDDED_IN_HEALTH_APP=true npm run dev` (port `5174`).
4. Main UI — healthassistant `frontend` `npm run dev` (proxies `/care` → 5174, `/marketplace-api` → 8000).

Patients use **Sign up** in the main app only. Opening **Find a dietitian** syncs the Supabase session via `POST /api/auth/sync`.

## Dietitian / org rules

Until admin approves uploaded credentials:

- Dietitians can use **Registration**, **Availability**, and **Settings**.
- **Messages**, **appointments**, **patient files**, and **calls** are blocked in UI and API (`403`-style `400` from actions).

After approval, the dietitian appears in patient search and can use the full marketplace.

## Supabase

Use the **same Supabase project** as healthassistant. Run:

- `healthassistant/backend/migrations/024_meallensai_marketplace_tables.sql` (prefixed `mp_*` tables), or
- `backend/sql/schema.sql` on a dedicated schema if you prefer unprefixed names.

Set on the marketplace API:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Leave unset to keep using `backend/data/database.json` for local demos.
