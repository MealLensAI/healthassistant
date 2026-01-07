# Supabase RLS Policy Violation Fix

## Problem

The application was experiencing Row Level Security (RLS) policy violations when trying to save meal plans to the `meal_plan_management` table in Supabase. The error message was:

```
'new row violates row-level security policy for table "meal_plan_management"'
```

## Root Cause

Even though the backend is using the `SUPABASE_SERVICE_ROLE_KEY` (which should automatically bypass RLS), Supabase was still enforcing RLS policies on the `meal_plan_management` table. This can happen if:

1. The service role key is not being recognized properly by Supabase
2. RLS policies are incorrectly configured
3. The Supabase client is not using the service role key correctly

## Solution

We've implemented a multi-layered solution:

### 1. Enhanced Error Handling

Updated `backend/services/supabase_service.py`:
- Added better logging to verify service role key usage
- Added specific error detection for RLS violations
- Added fallback to RPC function if direct insert fails

### 2. RPC Function Fallback

Created `backend/database/FIX_MEAL_PLAN_RLS.sql` which provides:
- **Option A**: RLS policies that allow authenticated users to insert their own meal plans
- **Option B**: An RPC function with `SECURITY DEFINER` that explicitly bypasses RLS (recommended)

### 3. Route Handler Updates

Updated `backend/routes/meal_plan_routes.py`:
- Added proper handling for RLS policy violation errors
- Provides helpful error messages with hints and solutions

## How to Apply the Fix

### Step 1: Run the SQL Script

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `backend/database/FIX_MEAL_PLAN_RLS.sql`
4. Run the SQL script

This will create:
- RLS policies for the `meal_plan_management` table (Option A)
- An RPC function `insert_meal_plan_management` that bypasses RLS (Option B)

### Step 2: Verify the Fix

The backend code will automatically:
1. Try direct insert first (using service role key)
2. If RLS violation occurs, automatically fall back to the RPC function
3. If RPC function doesn't exist, return a helpful error message

### Step 3: Test

Try saving a meal plan. The system should now:
- Work with the service role key (if properly configured)
- Fall back to RPC function if needed
- Provide clear error messages if both fail

## Verification

After applying the fix, you can verify:

1. **Check RLS status**:
   ```sql
   SELECT schemaname, tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'meal_plan_management';
   ```

2. **List policies**:
   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, cmd
   FROM pg_policies 
   WHERE tablename = 'meal_plan_management';
   ```

3. **Test RPC function** (if using Option B):
   ```sql
   SELECT * FROM insert_meal_plan_management(
       'test-id',
       'user-id',
       'Test Plan',
       '2026-01-01'::DATE,
       '2026-01-07'::DATE,
       '{"test": "data"}'::JSONB
   );
   ```

## Notes

- The service role key **should** bypass RLS automatically, but the RPC function provides a reliable fallback
- Option B (RPC function) is recommended because it explicitly bypasses RLS using `SECURITY DEFINER`
- The backend code will automatically use the RPC function if direct insert fails
- Both options can coexist - the RPC function will be used as a fallback

## Files Modified

1. `backend/services/supabase_service.py` - Enhanced error handling and RPC fallback
2. `backend/routes/meal_plan_routes.py` - Better error handling for RLS violations
3. `backend/database/FIX_MEAL_PLAN_RLS.sql` - SQL script to fix RLS policies (NEW)

## Next Steps

If the issue persists after applying the fix:

1. Verify that `SUPABASE_SERVICE_ROLE_KEY` is set correctly in your environment
2. Check that the service role key is actually a service role key (not an anon key)
3. Verify the RPC function was created successfully in Supabase
4. Check Supabase logs for more detailed error messages

