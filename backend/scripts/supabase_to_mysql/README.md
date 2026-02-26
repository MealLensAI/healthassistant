# Supabase → MySQL migration

This folder contains a **blueprint schema** and a **migration script** to duplicate your Supabase (PostgreSQL) database into MySQL.

## What you get

| File | Purpose |
|------|--------|
| `schema_mysql.sql` | MySQL DDL for all tables used by the healthassistant backend. Use as blueprint or apply directly. |
| `migrate_supabase_to_mysql.py` | Script that applies the schema and copies all data from Supabase (REST API) into MySQL. |

## 1. Environment variables

Add these to **`backend/.env`** (in addition to your existing Supabase vars):

```env
# Existing Supabase (already in your .env)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# MySQL target
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=your_mysql_user
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=healthassistant
```

Create the MySQL database first:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS healthassistant CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

## 2. Install dependencies

From the **project root** or **backend**:

```bash
pip install supabase python-dotenv pymysql
```

(Your project already has `supabase` and `dotenv` in `backend/requirements.txt`; you only need `pymysql` for this script.)

## 3. Run the migration

From the **project root**:

```bash
python backend/scripts/supabase_to_mysql/migrate_supabase_to_mysql.py
```

Or from **backend**:

```bash
cd backend && python scripts/supabase_to_mysql/migrate_supabase_to_mysql.py
```

Options:

- **`--schema-only`** – Only run `schema_mysql.sql`; do not copy any data.
- **`--tables a,b,c`** – Migrate only the given tables (e.g. `--tables profiles,feedback,detection_history`).

Example:

```bash
python backend/scripts/supabase_to_mysql/migrate_supabase_to_mysql.py --schema-only
python backend/scripts/supabase_to_mysql/migrate_supabase_to_mysql.py --tables profiles,meal_plan_management
```

## 4. Tables included

The schema and script cover all tables referenced by the backend:

- `profiles`, `feedback`, `ai_sessions`, `detection_history`
- `meal_plan_management`, `user_sessions`, `user_settings`, `user_settings_history`
- `enterprises`, `organization_users`, `invitations`
- `user_trials`, `payment_transactions`, `user_subscriptions`, `feature_usage`

Tables are created with **`IF NOT EXISTS`**; data is inserted with **`INSERT IGNORE`** to avoid duplicate-key errors on re-runs.

## 5. Using only the blueprint

If you prefer to set up MySQL by hand or with your own ETL:

1. Open **`schema_mysql.sql`** and run it in your MySQL client (or your migration tool).
2. Export data from Supabase (Dashboard → Table Editor, or SQL, or the Supabase REST API) and load it into MySQL using your own process.

The schema uses the same table and column names as the backend expects, so once data is in MySQL you can point the app at MySQL instead of Supabase (that switch would require backend code changes to use a MySQL client instead of the Supabase client).

## 6. Getting the exact Supabase schema (optional)

The provided `schema_mysql.sql` was inferred from backend code. To get the **exact** PostgreSQL schema from Supabase:

1. In Supabase Dashboard: **Project Settings → Database**.
2. Copy the **Connection string** (URI).
3. Add it to `backend/.env` as `SUPABASE_DB_URL` (optional; not used by this script).
4. From your machine (with `psql` or a Postgres client), run:

   ```bash
   pg_dump "$SUPABASE_DB_URL" --schema-only --no-owner --no-privileges -f supabase_schema.sql
   ```

Then you can convert that DDL to MySQL manually or with a converter; the provided `schema_mysql.sql` is already a ready-to-use MySQL version of the same logical schema.
