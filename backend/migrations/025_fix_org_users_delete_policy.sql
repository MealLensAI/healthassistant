-- Fix organization_users DELETE policy for service_role
-- Issue: DELETE operations failing because service_role doesn't have explicit DELETE policy
-- Date: 2026-01-04

-- ============================================================================
-- CHECK CURRENT POLICIES
-- ============================================================================

-- First, let's see what policies exist
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'organization_users'
ORDER BY policyname, cmd;

-- ============================================================================
-- ENSURE RLS IS ENABLED
-- ============================================================================

ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING POLICIES (to recreate cleanly)
-- ============================================================================

-- Drop all existing policies on organization_users
DROP POLICY IF EXISTS "service_role_full_access_org_users" ON organization_users CASCADE;
DROP POLICY IF EXISTS "service_role_can_delete_org_users" ON organization_users CASCADE;
DROP POLICY IF EXISTS "service_role_can_read_org_users" ON organization_users CASCADE;
DROP POLICY IF EXISTS "service_role_can_insert_org_users" ON organization_users CASCADE;
DROP POLICY IF EXISTS "service_role_can_update_org_users" ON organization_users CASCADE;
DROP POLICY IF EXISTS "users_read_own_membership" ON organization_users CASCADE;

-- ============================================================================
-- CREATE SERVICE_ROLE FULL ACCESS POLICY (ALL operations including DELETE)
-- ============================================================================

CREATE POLICY "service_role_full_access_org_users" ON organization_users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- CREATE AUTHENTICATED USER POLICY (read own membership)
-- ============================================================================

CREATE POLICY "users_read_own_membership" ON organization_users
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON organization_users TO service_role;
GRANT SELECT ON organization_users TO authenticated;

-- ============================================================================
-- VERIFY POLICIES WERE CREATED
-- ============================================================================

SELECT 
    'Policy check' as check_type,
    policyname,
    cmd,
    roles::text as roles
FROM pg_policies
WHERE tablename = 'organization_users'
ORDER BY policyname, cmd;

-- Should see:
-- - service_role_full_access_org_users with cmd = 'ALL' and roles containing 'service_role'
-- - users_read_own_membership with cmd = 'SELECT' and roles containing 'authenticated'

-- ============================================================================
-- VERIFY GRANT PERMISSIONS
-- ============================================================================

SELECT 
    'Grant check' as check_type,
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name = 'organization_users'
AND grantee = 'service_role'
ORDER BY privilege_type;

-- Should see ALL privilege types for service_role

