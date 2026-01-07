-- ============================================================================
-- Fix RLS Policy for meal_plan_management table
-- ============================================================================
-- 
-- This script fixes the Row Level Security (RLS) issue that prevents
-- meal plans from being saved. The service role key should bypass RLS,
-- but if it's not working, we can either:
-- 1. Add RLS policies that allow inserts (Option A)
-- 2. Create an RPC function with SECURITY DEFINER (Option B - Recommended)
--
-- ============================================================================

-- ============================================================================
-- OPTION A: Add RLS Policies (if service role key is not bypassing RLS)
-- ============================================================================

-- Enable RLS on meal_plan_management table (if not already enabled)
ALTER TABLE meal_plan_management ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_can_insert_own_meal_plans" ON meal_plan_management;
DROP POLICY IF EXISTS "users_can_select_own_meal_plans" ON meal_plan_management;
DROP POLICY IF EXISTS "users_can_update_own_meal_plans" ON meal_plan_management;
DROP POLICY IF EXISTS "users_can_delete_own_meal_plans" ON meal_plan_management;
DROP POLICY IF EXISTS "service_role_bypass" ON meal_plan_management;

-- Policy 1: Users can INSERT their own meal plans
CREATE POLICY "users_can_insert_own_meal_plans" 
ON meal_plan_management 
FOR INSERT 
TO authenticated
WITH CHECK (
    -- User can only insert meal plans for themselves
    user_id = auth.uid()
);

-- Policy 2: Users can SELECT their own meal plans
CREATE POLICY "users_can_select_own_meal_plans" 
ON meal_plan_management 
FOR SELECT 
TO authenticated
USING (
    -- User can only view their own meal plans
    user_id = auth.uid()
);

-- Policy 3: Users can UPDATE their own meal plans
CREATE POLICY "users_can_update_own_meal_plans" 
ON meal_plan_management 
FOR UPDATE 
TO authenticated
USING (
    user_id = auth.uid()
)
WITH CHECK (
    user_id = auth.uid()
);

-- Policy 4: Users can DELETE their own meal plans
CREATE POLICY "users_can_delete_own_meal_plans" 
ON meal_plan_management 
FOR DELETE 
TO authenticated
USING (
    user_id = auth.uid()
);

-- ============================================================================
-- OPTION B: Create RPC Function with SECURITY DEFINER (Recommended)
-- ============================================================================
-- This function runs with the privileges of the function creator (postgres),
-- which bypasses RLS policies. This is the recommended approach.

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS insert_meal_plan_management(
    p_id TEXT,
    p_user_id TEXT,
    p_name TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_meal_plan JSONB,
    p_has_sickness BOOLEAN,
    p_sickness_type TEXT,
    p_is_approved BOOLEAN,
    p_health_assessment JSONB,
    p_user_info JSONB,
    p_created_at TIMESTAMPTZ,
    p_updated_at TIMESTAMPTZ
);

-- Create RPC function that bypasses RLS
CREATE OR REPLACE FUNCTION insert_meal_plan_management(
    p_id TEXT,
    p_user_id TEXT,
    p_name TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_meal_plan JSONB,
    p_has_sickness BOOLEAN DEFAULT FALSE,
    p_sickness_type TEXT DEFAULT '',
    p_is_approved BOOLEAN DEFAULT TRUE,
    p_health_assessment JSONB DEFAULT NULL,
    p_user_info JSONB DEFAULT NULL,
    p_created_at TIMESTAMPTZ DEFAULT NOW(),
    p_updated_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    id TEXT,
    user_id TEXT,
    name TEXT,
    start_date DATE,
    end_date DATE,
    meal_plan JSONB,
    has_sickness BOOLEAN,
    sickness_type TEXT,
    is_approved BOOLEAN,
    health_assessment JSONB,
    user_info JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER  -- This bypasses RLS policies
SET search_path = public
AS $$
BEGIN
    INSERT INTO meal_plan_management (
        id,
        user_id,
        name,
        start_date,
        end_date,
        meal_plan,
        has_sickness,
        sickness_type,
        is_approved,
        health_assessment,
        user_info,
        created_at,
        updated_at
    ) VALUES (
        p_id,
        p_user_id,
        p_name,
        p_start_date,
        p_end_date,
        p_meal_plan,
        p_has_sickness,
        p_sickness_type,
        p_is_approved,
        p_health_assessment,
        p_user_info,
        p_created_at,
        p_updated_at
    )
    RETURNING 
        meal_plan_management.id,
        meal_plan_management.user_id,
        meal_plan_management.name,
        meal_plan_management.start_date,
        meal_plan_management.end_date,
        meal_plan_management.meal_plan,
        meal_plan_management.has_sickness,
        meal_plan_management.sickness_type,
        meal_plan_management.is_approved,
        meal_plan_management.health_assessment,
        meal_plan_management.user_info,
        meal_plan_management.created_at,
        meal_plan_management.updated_at;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_meal_plan_management TO authenticated;
GRANT EXECUTE ON FUNCTION insert_meal_plan_management TO anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'meal_plan_management';

-- List all policies on meal_plan_management
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'meal_plan_management'
ORDER BY policyname;

-- Test the RPC function (replace with actual values)
-- SELECT * FROM insert_meal_plan_management(
--     'test-id-123',
--     'user-id-123',
--     'Test Plan',
--     '2026-01-01'::DATE,
--     '2026-01-07'::DATE,
--     '{"test": "data"}'::JSONB,
--     FALSE,
--     '',
--     TRUE,
--     NULL,
--     NULL,
--     NOW(),
--     NOW()
-- );

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- 1. The service role key SHOULD bypass RLS automatically, but if it's not
--    working, use Option B (RPC function with SECURITY DEFINER).
--
-- 2. Option A (RLS policies) is a fallback if you want to enforce RLS at the
--    policy level instead of relying on service role key bypass.
--
-- 3. Option B is recommended because:
--    - It explicitly bypasses RLS using SECURITY DEFINER
--    - It's more reliable than relying on service role key behavior
--    - It provides better control over what can be inserted
--
-- 4. To apply this fix:
--    - Copy this entire file
--    - Go to Supabase Dashboard > SQL Editor
--    - Paste and run the SQL
--    - Verify with the verification queries at the end
--
-- 5. After applying Option B, update the backend code to use the RPC function
--    as a fallback if direct insert fails.
--
-- ============================================================================

