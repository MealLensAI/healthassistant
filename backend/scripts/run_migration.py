"""
Run a SQL migration file against the Supabase/Postgres database.

Usage (from backend/):
  python scripts/run_migration.py migrations/021_food_for_you.sql

Requires DATABASE_URL in backend/.env
(Supabase → Project Settings → Database → Connection string → URI)
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv


def main() -> int:
    backend_dir = Path(__file__).resolve().parents[1]
    load_dotenv(backend_dir / ".env")

    parser = argparse.ArgumentParser(description="Run a SQL migration file")
    parser.add_argument(
        "migration",
        help="Path to .sql file (absolute, or relative to backend/)",
    )
    args = parser.parse_args()

    migration_path = Path(args.migration)
    if not migration_path.is_absolute():
        migration_path = backend_dir / migration_path
    migration_path = migration_path.resolve()

    if not migration_path.exists():
        print(f"❌ Migration file not found: {migration_path}")
        return 1

    database_url = (
        os.environ.get("DATABASE_URL")
        or os.environ.get("SUPABASE_DB_URL")
        or os.environ.get("POSTGRES_URL")
    )
    if not database_url:
        print("❌ Missing DATABASE_URL in backend/.env")
        print("   Supabase → Project Settings → Database → Connection string → URI")
        print("   Example: postgresql://postgres.[ref]:[PASSWORD]@aws-0-....pooler.supabase.com:6543/postgres")
        return 1

    try:
        import psycopg
    except ImportError:
        print("❌ psycopg is not installed. Run: pip install 'psycopg[binary]'")
        return 1

    sql = migration_path.read_text(encoding="utf-8")
    print(f"Running migration: {migration_path.name}")

    try:
        with psycopg.connect(database_url, autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
        print("Migration completed successfully")
        return 0
    except Exception as exc:
        print(f"Migration failed: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
