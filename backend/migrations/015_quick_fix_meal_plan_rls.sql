-- Quick Fix: Meal Plan Management Table RLS Policy
-- Run this immediately if meal_plan_management table is blocking inserts
-- This is a focused fix for the immediate issue

-- Drop ALL existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'meal_plan_management'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.meal_plan_management CASCADE', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.meal_plan_management ENABLE ROW LEVEL SECURITY;

-- Create service_role policy with FOR ALL (covers INSERT, SELECT, UPDATE, DELETE)
CREATE POLICY "service_role_full_access_meal_plans" ON public.meal_plan_management
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Also create explicit INSERT policy (redundant but ensures it works)
CREATE POLICY "service_role_can_insert_meal_plans" ON public.meal_plan_management
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Allow authenticated users to insert their own meal plans
CREATE POLICY "users_insert_own_meal_plans" ON public.meal_plan_management
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to read their own meal plans
CREATE POLICY "users_read_own_meal_plans" ON public.meal_plan_management
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Grant explicit permissions
GRANT ALL ON public.meal_plan_management TO service_role;

-- Verify
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'meal_plan_management'
ORDER BY policyname;

