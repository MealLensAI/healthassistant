-- Migration: Fix RLS policies for meal_plan_management table
-- Purpose: Allow backend (service role) and users to insert/read meal plans
-- Date: 2026-01-04

-- ============================================================================
-- MEAL_PLAN_MANAGEMENT TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE meal_plan_management ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "service_role_full_access_meal_plans" ON meal_plan_management;
DROP POLICY IF EXISTS "users_insert_own_meal_plans" ON meal_plan_management;
DROP POLICY IF EXISTS "users_read_own_meal_plans" ON meal_plan_management;
DROP POLICY IF EXISTS "users_update_own_meal_plans" ON meal_plan_management;
DROP POLICY IF EXISTS "users_delete_own_meal_plans" ON meal_plan_management;

-- ============================================================================
-- SERVICE ROLE ACCESS (Backend)
-- ============================================================================

-- Allow service role (backend) full access to all meal plans
CREATE POLICY "service_role_full_access_meal_plans" ON meal_plan_management
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- AUTHENTICATED USER ACCESS
-- ============================================================================

-- Allow authenticated users to insert their own meal plans
CREATE POLICY "users_insert_own_meal_plans" ON meal_plan_management
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to read their own meal plans
CREATE POLICY "users_read_own_meal_plans" ON meal_plan_management
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Allow authenticated users to update their own meal plans
CREATE POLICY "users_update_own_meal_plans" ON meal_plan_management
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to delete their own meal plans
CREATE POLICY "users_delete_own_meal_plans" ON meal_plan_management
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- List all policies for meal_plan_management
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'meal_plan_management'
ORDER BY policyname;

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. Backend uses service role (admin client) which bypasses RLS
-- 2. Service role has full access to all meal plans
-- 3. Regular users can only insert/read/update/delete their own meal plans
-- 4. The user_id column must match auth.uid() for user access

