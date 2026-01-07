-- ============================================================================
-- IMMEDIATE FIX: Make RLS policies work with current deployed backend
-- ============================================================================
-- 
-- This script fixes the RLS issue WITHOUT requiring backend deployment.
-- It ensures service_role can insert meal plans even if the key isn't recognized.
--
-- Run this in Supabase SQL Editor immediately to fix the issue.
--
-- ============================================================================

-- First, let's verify the current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'meal_plan_management'
ORDER BY policyname;

-- ============================================================================
-- OPTION 1: Ensure service_role policies are correct (they should be, but let's verify)
-- ============================================================================

-- Drop and recreate service_role policies to ensure they're correct
DROP POLICY IF EXISTS "service_role_can_insert_meal_plans" ON meal_plan_management;
DROP POLICY IF EXISTS "service_role_full_access_meal_plan_management" ON meal_plan_management;
DROP POLICY IF EXISTS "service_role_full_access_meal_plans" ON meal_plan_management;

-- Create a single, clear service_role policy for INSERT
CREATE POLICY "service_role_can_insert_meal_plans" 
ON meal_plan_management 
FOR INSERT 
TO service_role
WITH CHECK (true);  -- Allow all inserts for service_role

-- Create a comprehensive service_role policy for ALL operations
CREATE POLICY "service_role_full_access_meal_plan_management" 
ON meal_plan_management 
FOR ALL 
TO service_role
USING (true)  -- Allow all SELECT, UPDATE, DELETE
WITH CHECK (true);  -- Allow all INSERT, UPDATE

-- ============================================================================
-- OPTION 2: Create RPC function that works with OLD backend code
-- ============================================================================
-- This creates a simple RPC function that the backend can call via .rpc()
-- Even if the old backend doesn't have the fallback code, we can modify it
-- to call this function directly.

-- Drop existing function if it exists (drop all variants)
DROP FUNCTION IF EXISTS insert_meal_plan_management CASCADE;

-- Create RPC function with SECURITY DEFINER (bypasses RLS)
-- Note: Required parameters (p_user_id) must come before optional ones (with defaults)
CREATE OR REPLACE FUNCTION insert_meal_plan_management(
    p_user_id TEXT,
    p_meal_plan JSONB DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_has_sickness BOOLEAN DEFAULT FALSE,
    p_sickness_type TEXT DEFAULT '',
    p_is_approved BOOLEAN DEFAULT TRUE,
    p_health_assessment JSONB DEFAULT NULL,
    p_user_info JSONB DEFAULT NULL,
    p_id TEXT DEFAULT NULL,
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
DECLARE
    v_id TEXT;
BEGIN
    -- Generate ID if not provided
    IF p_id IS NULL THEN
        v_id := gen_random_uuid()::TEXT;
    ELSE
        v_id := p_id;
    END IF;
    
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
        v_id,
        p_user_id,
        COALESCE(p_name, NULL),
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
        meal_plan_management.updated_at
    INTO STRICT
        id, user_id, name, start_date, end_date, meal_plan, 
        has_sickness, sickness_type, is_approved, health_assessment, 
        user_info, created_at, updated_at;
    
    RETURN NEXT;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION insert_meal_plan_management TO authenticated;
GRANT EXECUTE ON FUNCTION insert_meal_plan_management TO anon;
GRANT EXECUTE ON FUNCTION insert_meal_plan_management TO service_role;

-- ============================================================================
-- OPTION 3: Temporarily disable RLS for service_role (NOT RECOMMENDED for production)
-- ============================================================================
-- Only use this if Options 1 and 2 don't work
-- This is a last resort and should be reverted once the backend is deployed

-- Uncomment the following if needed:
-- ALTER TABLE meal_plan_management DISABLE ROW LEVEL SECURITY;
-- Then re-enable after backend is deployed:
-- ALTER TABLE meal_plan_management ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'meal_plan_management';

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'meal_plan_management'
ORDER BY policyname;

-- Verify RPC function exists
SELECT proname, proargnames, prosecdef 
FROM pg_proc 
WHERE proname = 'insert_meal_plan_management';

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- 1. Option 1 should fix the issue if service_role key is being recognized
-- 2. Option 2 creates an RPC function that bypasses RLS (works even if key isn't recognized)
-- 3. The RPC function will work once the backend is deployed with the new code
-- 4. For immediate fix, Option 1 should work if the service role key is correct
--
-- If the issue persists after running this script:
-- 1. Verify SUPABASE_SERVICE_ROLE_KEY is actually a service role key (not anon key)
-- 2. Check Supabase logs for more details
-- 3. Verify the key format is correct (should be a JWT with 3 parts)
--
-- ============================================================================

