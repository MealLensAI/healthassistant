#!/usr/bin/env python3
"""
Migrate data from Supabase (PostgreSQL) to MySQL.

Uses backend/.env for:
  - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (Supabase REST)
  - MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE (MySQL)

Run from repo root or backend/:
  python backend/scripts/supabase_to_mysql/migrate_supabase_to_mysql.py [--schema-only] [--tables table1,table2]
  cd backend && python scripts/supabase_to_mysql/migrate_supabase_to_mysql.py

Requires: pip install supabase python-dotenv pymysql
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Load .env from backend/ (script lives in backend/scripts/supabase_to_mysql/)
_backend_dir = Path(__file__).resolve().parents[2]
_env_path = _backend_dir / ".env"
if _env_path.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_path)
    except ImportError:
        pass

_repo_root = _backend_dir.parent
# Optional: add backend to path for local runs
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
MYSQL_HOST = os.environ.get("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.environ.get("MYSQL_PORT", "3306"))
MYSQL_USER = os.environ.get("MYSQL_USER")
MYSQL_PASSWORD = os.environ.get("MYSQL_PASSWORD")
MYSQL_DATABASE = os.environ.get("MYSQL_DATABASE")

# Tables to migrate (order can matter for FKs; we don't create FKs in MySQL so order is for clarity)
# Matches Supabase public schema: detection_history, enterprises, feature_usage, feedback,
# invitations, meal_plan_management, organization_users, payment_transactions, paystack_webhooks,
# pending_meal_plans, profiles, sessions, shared_recipes, subscription_plans, usage_tracking,
# user_settings, user_settings_history, user_subscriptions, user_trials (+ ai_sessions, user_sessions if present)
DEFAULT_TABLES = [
    "profiles",
    "feedback",
    "ai_sessions",
    "detection_history",
    "meal_plan_management",
    "user_sessions",
    "sessions",
    "user_settings",
    "user_settings_history",
    "enterprises",
    "organization_users",
    "invitations",
    "user_trials",
    "payment_transactions",
    "user_subscriptions",
    "feature_usage",
    "paystack_webhooks",
    "pending_meal_plans",
    "shared_recipes",
    "subscription_plans",
    "usage_tracking",
]

# Supabase column name -> MySQL column name (if different); e.g. 'google' is reserved in MySQL
COLUMN_ALIASES = {
    "google": "google",  # we use backticks in schema: `google`
}


def ensure_deps():
    try:
        import supabase  # noqa: F401
        import pymysql  # noqa: F401
    except ImportError as e:
        print("Missing dependency. Install with: pip install supabase python-dotenv pymysql")
        raise SystemExit(1) from e


def get_supabase_client():
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env")
        sys.exit(1)
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_mysql_connection():
    if not all([MYSQL_USER, MYSQL_DATABASE]):
        print("Set MYSQL_USER and MYSQL_DATABASE in backend/.env (MYSQL_PASSWORD optional for local)")
        sys.exit(1)
    try:
        import pymysql
        conn = pymysql.connect(
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD or "",
            database=MYSQL_DATABASE,
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
        )
        return conn
    except Exception as e:
        print(f"MySQL connection failed: {e}")
        sys.exit(1)


def run_schema_sql(mysql_conn) -> None:
    schema_path = Path(__file__).resolve().parent / "schema_mysql.sql"
    if not schema_path.exists():
        print(f"Schema file not found: {schema_path}")
        return
    # Ensure sessions table uses session_id (Supabase column name); drop if it had old "id" column
    try:
        with mysql_conn.cursor() as cur:
            cur.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'sessions' AND COLUMN_NAME = 'id'", (MYSQL_DATABASE,))
            if cur.fetchone():
                cur.execute("DROP TABLE IF EXISTS `sessions`")
                mysql_conn.commit()
    except Exception:
        pass
    sql = schema_path.read_text(encoding="utf-8")
    # Strip single-line comments so semicolons inside comments don't break split
    lines = []
    for line in sql.splitlines():
        if "--" in line:
            comment_start = line.find("--")
            if comment_start >= 0 and (line[:comment_start].strip() == "" or not _inside_string(line, comment_start)):
                line = line[:comment_start].rstrip()
        if line.strip():
            lines.append(line)
    sql_clean = "\n".join(lines)
    # Split by semicolon and run each statement
    statements = [s.strip() for s in sql_clean.split(";") if s.strip()]
    with mysql_conn.cursor() as cur:
        for stmt in statements:
            if not stmt:
                continue
            if stmt.upper().startswith("SET "):
                try:
                    cur.execute(stmt)
                except Exception:
                    pass
                continue
            try:
                cur.execute(stmt)
            except Exception as e:
                if "1050" in str(e) or "already exists" in str(e).lower():
                    print(f"  [skip] {stmt[:60]}... (already exists)")
                else:
                    print(f"  [warn] {e}")
    mysql_conn.commit()
    print("Schema applied from schema_mysql.sql")


def _inside_string(line: str, pos: int) -> bool:
    """True if pos is inside a string literal (single or double quoted)."""
    in_single = in_double = False
    i = 0
    while i < pos and i < len(line):
        c = line[i]
        if c == "'" and (i == 0 or line[i - 1] != "\\"):
            in_single = not in_single
        elif c == '"' and (i == 0 or line[i - 1] != "\\"):
            in_double = not in_double
        i += 1
    return in_single or in_double


def serialize_value(val, column_name: str, is_json_column: bool = False):
    """Convert Supabase/Postgres value to MySQL-friendly value."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%d %H:%M:%S.%f")[:26]
    if isinstance(val, str) and column_name and ("at" in column_name or "date" in column_name or "timestamp" in column_name) and not is_json_column:
        # Supabase often returns ISO8601 strings; normalize to MySQL datetime
        try:
            s = val.replace("Z", "+00:00")
            dt = datetime.fromisoformat(s)
            return dt.strftime("%Y-%m-%d %H:%M:%S.%f")[:26]
        except Exception:
            return val[:26] if len(val) >= 19 else val
    if isinstance(val, dict) or isinstance(val, list):
        return json.dumps(val, default=str)
    if is_json_column and isinstance(val, str):
        # Ensure valid JSON for MySQL JSON column (e.g. fix single-quoted or malformed)
        try:
            parsed = json.loads(val)
            return json.dumps(parsed, default=str)
        except (json.JSONDecodeError, TypeError):
            return json.dumps(val, default=str)
    if isinstance(val, bool):
        return 1 if val else 0
    return val


def fetch_all_from_supabase(supabase_client, table: str):
    """Yield all rows from a Supabase table using range pagination (1000 per page)."""
    page_size = 1000
    start = 0
    while True:
        try:
            # PostgREST uses Range: start-end (inclusive)
            result = supabase_client.table(table).select("*").range(start, start + page_size - 1).execute()
        except Exception as e:
            # Table might not exist or RLS
            print(f"  [warn] Could not fetch {table}: {e}")
            return
        rows = result.data if hasattr(result, "data") and result.data else []
        if not rows:
            break
        for row in rows:
            yield row
        if len(rows) < page_size:
            break
        start += page_size


def get_mysql_columns(mysql_conn, table: str) -> set:
    """Return set of column names for the table (from MySQL)."""
    with mysql_conn.cursor() as cur:
        cur.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s", (MYSQL_DATABASE, table))
        return {r["COLUMN_NAME"] for r in cur.fetchall()}


def migrate_table(supabase_client, mysql_conn, table: str) -> int:
    """Copy one table from Supabase to MySQL. Returns count inserted."""
    rows = list(fetch_all_from_supabase(supabase_client, table))
    if not rows:
        return 0
    mysql_cols = get_mysql_columns(mysql_conn, table)
    if not mysql_cols:
        print(f"  [warn] Table {table} has no columns in MySQL, skipping")
        return 0
    # Only use columns that exist in MySQL; determine JSON columns for serialization
    with mysql_conn.cursor() as cur:
        cur.execute(
            "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s",
            (MYSQL_DATABASE, table),
        )
        col_types = {r["COLUMN_NAME"]: r["DATA_TYPE"] for r in cur.fetchall()}
    json_cols = {c for c, t in col_types.items() if t == "json"}
    keys = [k for k in rows[0].keys() if k in mysql_cols]
    if not keys:
        print(f"  [warn] No matching columns for {table}, skipping")
        return 0
    cols = [f"`{k}`" for k in keys]
    placeholders = ", ".join(["%s"] * len(keys))
    columns_sql = ", ".join(cols)
    insert_sql = f"INSERT IGNORE INTO `{table}` ({columns_sql}) VALUES ({placeholders})"
    inserted = 0
    with mysql_conn.cursor() as cur:
        for row in rows:
            values = [
                serialize_value(row.get(k), k, is_json_column=(k in json_cols))
                for k in keys
            ]
            try:
                cur.execute(insert_sql, values)
                if cur.rowcount:
                    inserted += 1
            except Exception as e:
                print(f"  [error] {table} row: {e}")
    mysql_conn.commit()
    return inserted


def main():
    parser = argparse.ArgumentParser(description="Migrate Supabase data to MySQL")
    parser.add_argument("--schema-only", action="store_true", help="Only apply schema_mysql.sql, do not copy data")
    parser.add_argument("--tables", type=str, default=None, help="Comma-separated table names (default: all)")
    args = parser.parse_args()

    ensure_deps()
    mysql_conn = get_mysql_connection()

    try:
        # 1. Apply schema
        print("Applying MySQL schema...")
        run_schema_sql(mysql_conn)

        if args.schema_only:
            print("Schema-only run done.")
            return

        # 2. Migrate data
        supabase_client = get_supabase_client()
        tables = [t.strip() for t in args.tables.split(",")] if args.tables else DEFAULT_TABLES

        print("Migrating data from Supabase to MySQL...")
        for table in tables:
            n = migrate_table(supabase_client, mysql_conn, table)
            print(f"  {table}: {n} rows")
        # Verification summary (row counts in MySQL; 0 new rows can mean already migrated)
        print("\nVerification (total rows in MySQL now):")
        with mysql_conn.cursor() as cur:
            for table in tables:
                try:
                    cur.execute(f"SELECT COUNT(*) FROM `{table}`")
                    total = cur.fetchone()[0]
                    print(f"  {table}: {total} rows")
                except Exception:
                    pass
    finally:
        mysql_conn.close()

    print("Done.")


if __name__ == "__main__":
    main()
