-- Fix RLS policy for invitations table to ensure service_role can insert
-- This migration ensures the service_role has full access to the invitations table
-- Based on actual schema: invitations table with enterprise_id, email, invited_by, etc.

-- First, check current RLS status
DO $$
BEGIN
    RAISE NOTICE 'Current RLS status for invitations table';
END $$;

-- List all existing policies before dropping
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'invitations';

-- Drop existing policies if they exist (CASCADE to handle dependencies)
DROP POLICY IF EXISTS "service_role_full_access_invitations" ON public.invitations CASCADE;
DROP POLICY IF EXISTS "service_role_can_insert_invitations" ON public.invitations CASCADE;
DROP POLICY IF EXISTS "service_role_can_read_invitations" ON public.invitations CASCADE;
DROP POLICY IF EXISTS "service_role_can_update_invitations" ON public.invitations CASCADE;
DROP POLICY IF EXISTS "service_role_can_delete_invitations" ON public.invitations CASCADE;

-- Drop any other service_role policies that might exist
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'invitations' 
        AND policyname LIKE 'service_role%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.invitations CASCADE', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policy for service_role with full access
-- This policy allows service_role to perform ALL operations (SELECT, INSERT, UPDATE, DELETE)
-- Using public schema explicitly to match actual table location
CREATE POLICY "service_role_full_access_invitations" ON public.invitations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Also create specific policies for each operation to ensure coverage
-- These provide redundant coverage in case the FOR ALL policy has issues
CREATE POLICY "service_role_can_insert_invitations" ON public.invitations
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "service_role_can_select_invitations" ON public.invitations
    FOR SELECT
    TO service_role
    USING (true);

CREATE POLICY "service_role_can_update_invitations" ON public.invitations
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service_role_can_delete_invitations" ON public.invitations
    FOR DELETE
    TO service_role
    USING (true);

-- Grant necessary permissions to service_role
GRANT ALL ON public.invitations TO service_role;

-- Verify the policies were created successfully
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'invitations' 
    AND policyname LIKE 'service_role%';
    
    IF policy_count >= 5 THEN
        RAISE NOTICE '✅ Successfully created % service_role policies for invitations table', policy_count;
    ELSE
        RAISE WARNING '⚠️ Only % service_role policies found. Expected at least 5.', policy_count;
    END IF;
END $$;

-- List all policies for verification
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'invitations' 
ORDER BY policyname;

