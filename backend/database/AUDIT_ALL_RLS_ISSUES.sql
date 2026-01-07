-- ============================================================================
-- COMPREHENSIVE SUPABASE RLS AUDIT SCRIPT
-- ============================================================================
-- 
-- This script audits ALL tables for potential RLS issues and provides fixes.
-- Run this to identify and fix any Supabase RLS problems across your database.
--
-- ============================================================================

-- ============================================================================
-- STEP 1: List ALL tables with RLS enabled
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'RLS Enabled'
        ELSE 'RLS Disabled'
    END as status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- STEP 2: List ALL RLS policies for each table
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- STEP 3: Check for tables that need service_role policies
-- ============================================================================
-- These are tables that the backend writes to using service_role key

-- Check meal_plan_management (already fixed, but verify)
SELECT 
    'meal_plan_management' as table_name,
    COUNT(*) as service_role_policies,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Has service_role policies'
        ELSE '❌ Missing service_role policies'
    END as status
FROM pg_policies 
WHERE tablename = 'meal_plan_management' 
AND 'service_role' = ANY(roles);

-- Check user_settings
SELECT 
    'user_settings' as table_name,
    COUNT(*) as service_role_policies,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Has service_role policies'
        ELSE '❌ Missing service_role policies'
    END as status
FROM pg_policies 
WHERE tablename = 'user_settings' 
AND 'service_role' = ANY(roles);

-- Check user_settings_history
SELECT 
    'user_settings_history' as table_name,
    COUNT(*) as service_role_policies,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Has service_role policies'
        ELSE '❌ Missing service_role policies'
    END as status
FROM pg_policies 
WHERE tablename = 'user_settings_history' 
AND 'service_role' = ANY(roles);

-- Check detection_history
SELECT 
    'detection_history' as table_name,
    COUNT(*) as service_role_policies,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Has service_role policies'
        ELSE '❌ Missing service_role policies'
    END as status
FROM pg_policies 
WHERE tablename = 'detection_history' 
AND 'service_role' = ANY(roles);

-- Check organization_users
SELECT 
    'organization_users' as table_name,
    COUNT(*) as service_role_policies,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Has service_role policies'
        ELSE '❌ Missing service_role policies'
    END as status
FROM pg_policies 
WHERE tablename = 'organization_users' 
AND 'service_role' = ANY(roles);

-- Check enterprises
SELECT 
    'enterprises' as table_name,
    COUNT(*) as service_role_policies,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Has service_role policies'
        ELSE '❌ Missing service_role policies'
    END as status
FROM pg_policies 
WHERE tablename = 'enterprises' 
AND 'service_role' = ANY(roles);

-- Check invitations
SELECT 
    'invitations' as table_name,
    COUNT(*) as service_role_policies,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Has service_role policies'
        ELSE '❌ Missing service_role policies'
    END as status
FROM pg_policies 
WHERE tablename = 'invitations' 
AND 'service_role' = ANY(roles);

-- Check ai_sessions
SELECT 
    'ai_sessions' as table_name,
    COUNT(*) as service_role_policies,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Has service_role policies'
        ELSE '❌ Missing service_role policies'
    END as status
FROM pg_policies 
WHERE tablename = 'ai_sessions' 
AND 'service_role' = ANY(roles);

-- Check user_sessions
SELECT 
    'user_sessions' as table_name,
    COUNT(*) as service_role_policies,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Has service_role policies'
        ELSE '❌ Missing service_role policies'
    END as status
FROM pg_policies 
WHERE tablename = 'user_sessions' 
AND 'service_role' = ANY(roles);

-- Check feedback
SELECT 
    'feedback' as table_name,
    COUNT(*) as service_role_policies,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Has service_role policies'
        ELSE '❌ Missing service_role policies'
    END as status
FROM pg_policies 
WHERE tablename = 'feedback' 
AND 'service_role' = ANY(roles);

-- ============================================================================
-- STEP 4: Create service_role policies for ALL backend-managed tables
-- ============================================================================
-- This ensures service_role can perform all operations on these tables

-- user_settings
DROP POLICY IF EXISTS "service_role_full_access_user_settings" ON user_settings;
CREATE POLICY "service_role_full_access_user_settings" 
ON user_settings 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- user_settings_history
DROP POLICY IF EXISTS "service_role_full_access_user_settings_history" ON user_settings_history;
CREATE POLICY "service_role_full_access_user_settings_history" 
ON user_settings_history 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- detection_history
DROP POLICY IF EXISTS "service_role_full_access_detection_history" ON detection_history;
CREATE POLICY "service_role_full_access_detection_history" 
ON detection_history 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- organization_users
DROP POLICY IF EXISTS "service_role_full_access_organization_users" ON organization_users;
CREATE POLICY "service_role_full_access_organization_users" 
ON organization_users 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- enterprises
DROP POLICY IF EXISTS "service_role_full_access_enterprises" ON enterprises;
CREATE POLICY "service_role_full_access_enterprises" 
ON enterprises 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- invitations
DROP POLICY IF EXISTS "service_role_full_access_invitations" ON invitations;
CREATE POLICY "service_role_full_access_invitations" 
ON invitations 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- ai_sessions
DROP POLICY IF EXISTS "service_role_full_access_ai_sessions" ON ai_sessions;
CREATE POLICY "service_role_full_access_ai_sessions" 
ON ai_sessions 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- user_sessions
DROP POLICY IF EXISTS "service_role_full_access_user_sessions" ON user_sessions;
CREATE POLICY "service_role_full_access_user_sessions" 
ON user_sessions 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- feedback
DROP POLICY IF EXISTS "service_role_full_access_feedback" ON feedback;
CREATE POLICY "service_role_full_access_feedback" 
ON feedback 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- profiles (if backend manages it)
DROP POLICY IF EXISTS "service_role_full_access_profiles" ON profiles;
CREATE POLICY "service_role_full_access_profiles" 
ON profiles 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- STEP 5: Verify all policies were created
-- ============================================================================

SELECT 
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND 'service_role' = ANY(roles)
ORDER BY tablename, policyname;

-- ============================================================================
-- STEP 6: Summary Report
-- ============================================================================

SELECT 
    'Total tables with RLS enabled' as metric,
    COUNT(*)::TEXT as value
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true

UNION ALL

SELECT 
    'Total service_role policies' as metric,
    COUNT(*)::TEXT as value
FROM pg_policies 
WHERE schemaname = 'public'
AND 'service_role' = ANY(roles)

UNION ALL

SELECT 
    'Tables missing service_role policies' as metric,
    COUNT(DISTINCT tablename)::TEXT as value
FROM (
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND rowsecurity = true
    AND tablename IN (
        'user_settings', 'user_settings_history', 'detection_history',
        'organization_users', 'enterprises', 'invitations',
        'ai_sessions', 'user_sessions', 'feedback', 'profiles',
        'meal_plan_management'
    )
    EXCEPT
    SELECT DISTINCT tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND 'service_role' = ANY(roles)
) missing;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- 1. This script creates service_role policies for all backend-managed tables
-- 2. Service role key should bypass RLS, but these policies ensure it works
-- 3. If you still have issues, check:
--    - SUPABASE_SERVICE_ROLE_KEY is set correctly
--    - The key is actually a service_role key (not anon key)
--    - The Supabase client is using the service_role key
--
-- 4. After running this script:
--    - All backend operations should work with service_role key
--    - If issues persist, use RPC functions with SECURITY DEFINER
--
-- ============================================================================

