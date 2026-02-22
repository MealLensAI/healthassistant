-- Migration: Add RLS policies to meal_plan_management table
-- Purpose: Fix "new row violates row-level security policy" error (code 42501)
-- The table has RLS enabled but no policies were ever created.
-- Run this in the Supabase SQL Editor.

-- ============================================================================
-- MEAL_PLAN_MANAGEMENT TABLE
-- ============================================================================

-- Drop any existing policies (safety)
DROP POLICY IF EXISTS "service_role_full_access_meal_plans" ON meal_plan_management;
DROP POLICY IF EXISTS "users_insert_own_meal_plans" ON meal_plan_management;
DROP POLICY IF EXISTS "users_select_own_meal_plans" ON meal_plan_management;
DROP POLICY IF EXISTS "users_update_own_meal_plans" ON meal_plan_management;
DROP POLICY IF EXISTS "users_delete_own_meal_plans" ON meal_plan_management;

-- Ensure RLS is enabled
ALTER TABLE meal_plan_management ENABLE ROW LEVEL SECURITY;

-- Service role (backend) gets unrestricted access
CREATE POLICY "service_role_full_access_meal_plans"
    ON meal_plan_management
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users can insert their own meal plans
CREATE POLICY "users_insert_own_meal_plans"
    ON meal_plan_management
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Authenticated users can view their own meal plans (only approved ones)
CREATE POLICY "users_select_own_meal_plans"
    ON meal_plan_management
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Authenticated users can update their own meal plans
CREATE POLICY "users_update_own_meal_plans"
    ON meal_plan_management
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Authenticated users can delete their own meal plans
CREATE POLICY "users_delete_own_meal_plans"
    ON meal_plan_management
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'meal_plan_management'
ORDER BY policyname;
