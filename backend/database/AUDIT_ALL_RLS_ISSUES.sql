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

-- Check ai_sessions (only if table exists)
SELECT 
    'ai_sessions' as table_name,
    COALESCE(COUNT(*), 0) as service_role_policies,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_sessions') THEN
            CASE 
                WHEN COUNT(*) > 0 THEN '✅ Has service_role policies'
                ELSE '❌ Missing service_role policies'
            END
        ELSE '⚠️ Table does not exist'
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
-- Only creates policies for tables that actually exist

-- Helper function to check if table exists and create policy
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- user_settings
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP POLICY IF EXISTS "service_role_full_access_user_settings" ON user_settings;
        CREATE POLICY "service_role_full_access_user_settings" 
        ON user_settings 
        FOR ALL 
        TO service_role
        USING (true)
        WITH CHECK (true);
        RAISE NOTICE 'Created policy for user_settings';
    ELSE
        RAISE NOTICE 'Table user_settings does not exist, skipping';
    END IF;

    -- user_settings_history
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings_history'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP POLICY IF EXISTS "service_role_full_access_user_settings_history" ON user_settings_history;
        CREATE POLICY "service_role_full_access_user_settings_history" 
        ON user_settings_history 
        FOR ALL 
        TO service_role
        USING (true)
        WITH CHECK (true);
        RAISE NOTICE 'Created policy for user_settings_history';
    ELSE
        RAISE NOTICE 'Table user_settings_history does not exist, skipping';
    END IF;

    -- detection_history
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'detection_history'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP POLICY IF EXISTS "service_role_full_access_detection_history" ON detection_history;
        CREATE POLICY "service_role_full_access_detection_history" 
        ON detection_history 
        FOR ALL 
        TO service_role
        USING (true)
        WITH CHECK (true);
        RAISE NOTICE 'Created policy for detection_history';
    ELSE
        RAISE NOTICE 'Table detection_history does not exist, skipping';
    END IF;

    -- organization_users
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_users'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP POLICY IF EXISTS "service_role_full_access_organization_users" ON organization_users;
        CREATE POLICY "service_role_full_access_organization_users" 
        ON organization_users 
        FOR ALL 
        TO service_role
        USING (true)
        WITH CHECK (true);
        RAISE NOTICE 'Created policy for organization_users';
    ELSE
        RAISE NOTICE 'Table organization_users does not exist, skipping';
    END IF;

    -- enterprises
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'enterprises'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP POLICY IF EXISTS "service_role_full_access_enterprises" ON enterprises;
        CREATE POLICY "service_role_full_access_enterprises" 
        ON enterprises 
        FOR ALL 
        TO service_role
        USING (true)
        WITH CHECK (true);
        RAISE NOTICE 'Created policy for enterprises';
    ELSE
        RAISE NOTICE 'Table enterprises does not exist, skipping';
    END IF;

    -- invitations
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'invitations'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP POLICY IF EXISTS "service_role_full_access_invitations" ON invitations;
        CREATE POLICY "service_role_full_access_invitations" 
        ON invitations 
        FOR ALL 
        TO service_role
        USING (true)
        WITH CHECK (true);
        RAISE NOTICE 'Created policy for invitations';
    ELSE
        RAISE NOTICE 'Table invitations does not exist, skipping';
    END IF;

    -- ai_sessions (only if table exists)
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_sessions'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP POLICY IF EXISTS "service_role_full_access_ai_sessions" ON ai_sessions;
        CREATE POLICY "service_role_full_access_ai_sessions" 
        ON ai_sessions 
        FOR ALL 
        TO service_role
        USING (true)
        WITH CHECK (true);
        RAISE NOTICE 'Created policy for ai_sessions';
    ELSE
        RAISE NOTICE 'Table ai_sessions does not exist, skipping';
    END IF;

    -- user_sessions
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_sessions'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP POLICY IF EXISTS "service_role_full_access_user_sessions" ON user_sessions;
        CREATE POLICY "service_role_full_access_user_sessions" 
        ON user_sessions 
        FOR ALL 
        TO service_role
        USING (true)
        WITH CHECK (true);
        RAISE NOTICE 'Created policy for user_sessions';
    ELSE
        RAISE NOTICE 'Table user_sessions does not exist, skipping';
    END IF;

    -- feedback
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'feedback'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP POLICY IF EXISTS "service_role_full_access_feedback" ON feedback;
        CREATE POLICY "service_role_full_access_feedback" 
        ON feedback 
        FOR ALL 
        TO service_role
        USING (true)
        WITH CHECK (true);
        RAISE NOTICE 'Created policy for feedback';
    ELSE
        RAISE NOTICE 'Table feedback does not exist, skipping';
    END IF;

    -- profiles
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
    ) INTO table_exists;
    
    IF table_exists THEN
        DROP POLICY IF EXISTS "service_role_full_access_profiles" ON profiles;
        CREATE POLICY "service_role_full_access_profiles" 
        ON profiles 
        FOR ALL 
        TO service_role
        USING (true)
        WITH CHECK (true);
        RAISE NOTICE 'Created policy for profiles';
    ELSE
        RAISE NOTICE 'Table profiles does not exist, skipping';
    END IF;
END $$;

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

