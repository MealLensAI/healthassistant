#!/usr/bin/env python3
"""
Fix Supabase user_trials table and create_user_trial function
This script:
1. Adds the missing duration_days column to user_trials table
2. Drops the old 3-parameter create_user_trial function
3. Creates the correct 2-parameter function with 7-day default
4. Creates a trial for the test user
"""

import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

# Get Supabase credentials
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# Test user details
TEST_USER_ID = '7d6eb9a1-2680-45a1-9152-34c38fba3e97'
TEST_USER_EMAIL = 'da@gmail.com'

print("=" * 80)
print("SUPABASE TRIAL FIX SCRIPT")
print("=" * 80)
print(f"\nSupabase URL: {SUPABASE_URL}")
print(f"Test User ID: {TEST_USER_ID}")
print(f"Test User Email: {TEST_USER_EMAIL}")
print()

# Create Supabase client
print("Connecting to Supabase...")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
print("✅ Connected to Supabase\n")

# SQL to fix everything
fix_sql = """
-- Step 1: Add duration_days column to user_trials table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_trials' AND column_name = 'duration_days'
    ) THEN
        ALTER TABLE public.user_trials ADD COLUMN duration_days INT DEFAULT 7;
        RAISE NOTICE 'Added duration_days column';
    ELSE
        RAISE NOTICE 'duration_days column already exists';
    END IF;
END $$;

-- Step 2: Drop the old 3-parameter function
DROP FUNCTION IF EXISTS public.create_user_trial(p_user_id UUID, p_firebase_uid TEXT, p_duration_days INT);

-- Step 3: Create the correct 2-parameter function with 7-day default
CREATE OR REPLACE FUNCTION public.create_user_trial(p_user_id UUID, p_duration_days INT DEFAULT 7)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trial_id UUID := gen_random_uuid();
  start_ts TIMESTAMPTZ := NOW();
  days INT := COALESCE(NULLIF(p_duration_days, 0), 7);
  end_ts TIMESTAMPTZ := start_ts + (days || ' days')::INTERVAL;
BEGIN
  -- Check if user already has a trial
  IF EXISTS (SELECT 1 FROM public.user_trials WHERE user_id = p_user_id) THEN
    -- Update existing trial
    UPDATE public.user_trials 
    SET start_date = start_ts,
        end_date = end_ts,
        duration_days = days,
        is_active = true,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING id INTO trial_id;
    
    RETURN jsonb_build_object('id', trial_id, 'success', true, 'action', 'updated');
  ELSE
    -- Insert new trial record
    INSERT INTO public.user_trials (id, user_id, start_date, end_date, duration_days, is_active)
    VALUES (trial_id, p_user_id, start_ts, end_ts, days, true);
    
    RETURN jsonb_build_object('id', trial_id, 'success', true, 'action', 'created');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
"""

print("Executing SQL fixes...")
print("-" * 80)
try:
    result = supabase.rpc('exec_sql', {'sql': fix_sql}).execute()
    print("✅ SQL executed successfully")
except Exception as e:
    # If exec_sql doesn't exist, we need to run the SQL manually through PostgREST
    print(f"⚠️  Cannot execute SQL directly: {e}")
    print("\nTrying alternative approach...")
    
    # Try to execute via a transaction
    try:
        # Use the postgrest client to execute raw SQL
        result = supabase.postgrest.session.post(
            f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
            json={"sql": fix_sql},
            headers={
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
            }
        )
        if result.status_code == 200:
            print("✅ SQL executed via PostgREST")
        else:
            print(f"❌ Failed to execute SQL: {result.text}")
            print("\n⚠️  You need to run the SQL manually in Supabase SQL Editor")
            print("Saved SQL to: fix_supabase_schema.sql")
            
            # Save SQL to file for manual execution
            with open('fix_supabase_schema.sql', 'w') as f:
                f.write(fix_sql)
    except Exception as e2:
        print(f"❌ Alternative approach failed: {e2}")
        print("\n⚠️  Saving SQL to file for manual execution...")
        with open('fix_supabase_schema.sql', 'w') as f:
            f.write(fix_sql)
        print("✅ SQL saved to: fix_supabase_schema.sql")
        print("\nPlease run this SQL in your Supabase SQL Editor, then run this script again.")

print("\n" + "=" * 80)
print("Creating trial for test user...")
print("=" * 80)

try:
    # Create trial using the RPC function
    trial_result = supabase.rpc('create_user_trial', {
        'p_user_id': TEST_USER_ID,
        'p_duration_days': 7
    }).execute()
    
    print(f"\n✅ Trial creation result: {trial_result.data}")
    
    # Verify the trial
    print("\n" + "=" * 80)
    print("Verifying trial in database...")
    print("=" * 80)
    
    trial_query = supabase.table('user_trials').select('*').eq('user_id', TEST_USER_ID).execute()
    
    if trial_query.data:
        trial = trial_query.data[0]
        print(f"\n✅ TRIAL VERIFIED:")
        print(f"   User ID: {trial.get('user_id')}")
        print(f"   Start Date: {trial.get('start_date')}")
        print(f"   End Date: {trial.get('end_date')}")
        print(f"   Duration Days: {trial.get('duration_days')} days")
        print(f"   Is Active: {trial.get('is_active')}")
        print(f"   Is Used: {trial.get('is_used')}")
        
        # Calculate actual duration
        from datetime import datetime
        if trial.get('start_date') and trial.get('end_date'):
            start = datetime.fromisoformat(trial['start_date'].replace('Z', '+00:00'))
            end = datetime.fromisoformat(trial['end_date'].replace('Z', '+00:00'))
            duration = (end - start).days
            print(f"   Actual Duration: {duration} days")
            
            if duration == 7:
                print("\n🎉 SUCCESS! Trial is set to 7 days as expected!")
            else:
                print(f"\n⚠️  WARNING: Expected 7 days but got {duration} days")
    else:
        print("\n❌ No trial found for user")
        
except Exception as e:
    print(f"\n❌ Error creating trial: {e}")
    print("\nThis might be because the SQL fixes haven't been applied yet.")
    print("Please run the SQL in fix_supabase_schema.sql in your Supabase SQL Editor first.")

print("\n" + "=" * 80)
print("DONE")
print("=" * 80)
