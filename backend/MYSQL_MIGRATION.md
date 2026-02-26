# Application now runs on MySQL (data + auth)

The application uses **MySQL** for all database storage and authentication (register, login, JWT issue/verify).

## Required environment variables

**MySQL (required):**
- `MYSQL_HOST` (default: localhost)
- `MYSQL_PORT` (default: 3306)
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

**Auth (required):**
- `JWT_SECRET` – used to sign and verify JWTs (use a long random string, e.g. `openssl rand -hex 32`)

## Setup

1. Create the MySQL database and user (see `scripts/supabase_to_mysql/setup_mysql.sql` and `MYSQL_SETUP.md`).
2. Apply the schema: run `schema_mysql.sql` or use the migration script:
   ```bash
   python scripts/supabase_to_mysql/migrate_supabase_to_mysql.py --schema-only
   ```
3. (Optional) Copy existing data from Supabase:
   ```bash
   python scripts/supabase_to_mysql/migrate_supabase_to_mysql.py
   ```
4. Set `JWT_SECRET` in `.env` (e.g. `openssl rand -hex 32`).
5. Start the app; it will use MySQL for data and auth.

## Architecture

- **`services/database_service.py`** – MySQL-backed service for all table operations (feedback, detection_history, meal_plan_management, user_settings, enterprises, invitations, etc.).
- **`services/mysql_client.py`** – MySQL connection helper (pymysql).
- **`services/mysql_auth_service.py`** – Auth in MySQL: register, login, JWT create/verify, get_user_by_id, get_user_by_email, list_users, create_user (admin), delete_user, update_user_by_id, change_password, password reset tokens.
- **`services/mysql_auth_adapter.py`** – Adapter that provides `.auth` and `.auth.admin` for enterprise routes (MySQL auth).
- **`services/auth_service.py`** – Verifies JWTs (issued by mysql_auth_service) and returns user id.
- **`services/db_client_adapter.py`** – Database client with `.table()` and `.rpc()` backed by MySQL (`database_service`).
- **Auth** – Fully in MySQL: `auth_users` table (email, password_hash, user_metadata), JWTs signed with `JWT_SECRET`, profiles synced with auth_users.
- **File uploads** – Stored locally under `backend/uploads/` (configurable via `UPLOAD_BASE_URL`).

## Subscription and lifecycle services

`SubscriptionService` and `LifecycleSubscriptionService` use `current_app.database_service` for subscription/trial tables (`user_subscriptions`, `user_trials`, etc.).
