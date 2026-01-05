#!/usr/bin/env python3
"""
Simple script to display the migration SQL for easy copying to Supabase SQL Editor
"""

from pathlib import Path

migration_file = Path(__file__).parent / 'migrations' / '025_fix_org_users_delete_policy.sql'

print("=" * 80)
print("MIGRATION SQL - Copy and paste this into Supabase SQL Editor")
print("=" * 80)
print()
print(f"File: {migration_file}")
print()
print("-" * 80)
print()

with open(migration_file, 'r') as f:
    print(f.read())

print()
print("-" * 80)
print()
print("Instructions:")
print("1. Copy the SQL above")
print("2. Go to https://supabase.com/dashboard")
print("3. Select your project")
print("4. Go to SQL Editor")
print("5. Paste the SQL and click 'Run'")
print("6. Verify the results show the policies were created")
print()
print("=" * 80)

