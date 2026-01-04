-- Verify RLS Status - Check if policies are in place
-- Run this to see current RLS status

-- ============================================================================
-- CHECK RLS ENABLED STATUS
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT IN ('schema_migrations', '_prisma_migrations')
ORDER BY tablename;

-- ============================================================================
-- CHECK SERVICE_ROLE POLICIES
-- ============================================================================
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
AND policyname LIKE 'service_role%'
ORDER BY tablename, policyname;

-- ============================================================================
-- CHECK SERVICE_ROLE PERMISSIONS
-- ============================================================================
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'service_role'
AND table_schema = 'public'
AND table_name IN ('invitations', 'meal_plan_management', 'organization_users', 'enterprises')
ORDER BY table_name, privilege_type;

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT 
    'Tables with RLS enabled' as check_type,
    COUNT(*) as count
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
AND t.tablename NOT IN ('schema_migrations', '_prisma_migrations')
AND c.relrowsecurity = true

UNION ALL

SELECT 
    'Service role policies' as check_type,
    COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public'
AND policyname LIKE 'service_role%'

UNION ALL

SELECT 
    'Service role table grants' as check_type,
    COUNT(DISTINCT table_name) as count
FROM information_schema.role_table_grants
WHERE grantee = 'service_role'
AND table_schema = 'public';


≠≠