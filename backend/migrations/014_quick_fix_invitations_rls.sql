-- Quick Fix: Invitations Table RLS Policy
-- Run this immediately if invitations table is blocking inserts
-- This is a focused fix for the immediate issue

-- Drop ALL existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'invitations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.invitations CASCADE', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create service_role policy with FOR ALL (covers INSERT, SELECT, UPDATE, DELETE)
CREATE POLICY "service_role_full_access_invitations" ON public.invitations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Also create explicit INSERT policy (redundant but ensures it works)
CREATE POLICY "service_role_can_insert_invitations" ON public.invitations
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Grant explicit permissions
GRANT ALL ON public.invitations TO service_role;

-- Verify
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'invitations'
ORDER BY policyname;

