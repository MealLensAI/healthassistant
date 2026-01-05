#!/usr/bin/env python3
"""
Run migration 025_fix_org_users_delete_policy.sql
This ensures service_role has DELETE permission on organization_users table
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

def run_migration():
    """Execute the migration SQL"""
    
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_service_key:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file")
        return False
    
    print("=" * 60)
    print("Running Migration: Fix organization_users DELETE Policy")
    print("=" * 60)
    
    # Read the migration SQL file
    migration_file = Path(__file__).parent / 'migrations' / '025_fix_org_users_delete_policy.sql'
    
    if not migration_file.exists():
        print(f"❌ Error: Migration file not found: {migration_file}")
        return False
    
    with open(migration_file, 'r') as f:
        sql_content = f.read()
    
    # Split SQL into individual statements (simple approach - split by semicolons)
    # Note: This is a simplified parser. For production, use a proper SQL parser.
    statements = []
    current_statement = []
    
    for line in sql_content.split('\n'):
        # Skip comments and empty lines
        stripped = line.strip()
        if not stripped or stripped.startswith('--'):
            continue
        
        current_statement.append(line)
        
        # If line ends with semicolon, it's the end of a statement
        if stripped.endswith(';'):
            statement = '\n'.join(current_statement)
            if statement.strip():
                statements.append(statement)
            current_statement = []
    
    # Add any remaining statement
    if current_statement:
        statement = '\n'.join(current_statement)
        if statement.strip():
            statements.append(statement)
    
    print(f"\n📋 Found {len(statements)} SQL statements to execute")
    
    # Note: Supabase Python client doesn't support raw SQL execution directly
    # We need to use the REST API or a direct PostgreSQL connection
    # For now, we'll use psycopg2 if available, otherwise print instructions
    
    try:
        import psycopg2
        from urllib.parse import urlparse
        
        # Extract connection details from Supabase URL
        # Supabase connection string format: postgresql://postgres:[password]@[host]:[port]/postgres
        # We need to construct this from the service role key and URL
        
        print("\n⚠️  Note: Direct SQL execution requires psycopg2 and database connection string.")
        print("   The Supabase Python client doesn't support raw SQL execution.")
        print("\n   Please run this migration manually in Supabase SQL Editor:")
        print(f"   File: {migration_file}")
        print("\n   Or use the Supabase CLI:")
        print("   supabase db push")
        
        return False
        
    except ImportError:
        print("\n⚠️  psycopg2 not available. Cannot execute SQL directly.")
        print("\n   Please run this migration manually:")
        print(f"   1. Open Supabase Dashboard")
        print(f"   2. Go to SQL Editor")
        print(f"   3. Copy and paste the contents of: {migration_file}")
        print(f"   4. Click 'Run'")
        
        # Print the SQL for easy copying
        print("\n" + "=" * 60)
        print("SQL TO RUN:")
        print("=" * 60)
        print(sql_content)
        print("=" * 60)
        
        return False

if __name__ == '__main__':
    success = run_migration()
    sys.exit(0 if success else 1)

