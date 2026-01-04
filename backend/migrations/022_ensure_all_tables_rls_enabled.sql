-- Migration: Ensure RLS is enabled and service_role has access to ALL tables
-- Purpose: Comprehensive RLS setup for all tables, including user_settings_history
-- Date: 2026-01-04
-- 
-- This migration ensures:
-- 1. RLS is enabled on ALL public tables
-- 2. service_role has full access policies on ALL tables
-- 3. GRANT permissions are in place for ALL tables
-- 4. user_settings_history specifically has proper setup

-- ============================================================================
-- STEP 1: Enable RLS on ALL tables
-- ============================================================================

DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT IN ('schema_migrations', '_prisma_migrations')
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_record.tablename);
            RAISE NOTICE 'Enabled RLS on table: %', table_record.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not enable RLS on table % (error: %)', table_record.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: Create service_role full access policies for ALL tables
-- ============================================================================

DO $$
DECLARE
    table_record RECORD;
    policy_name TEXT;
    policy_exists BOOLEAN;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT IN ('schema_migrations', '_prisma_migrations')
    LOOP
        policy_name := 'service_role_full_access_' || table_record.tablename;
        
        -- Check if policy already exists
        SELECT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = table_record.tablename 
            AND policyname = policy_name
        ) INTO policy_exists;
        
        IF NOT policy_exists THEN
            BEGIN
                EXECUTE format(
                    'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
                    policy_name,
                    table_record.tablename
                );
                RAISE NOTICE 'Created policy % on table: %', policy_name, table_record.tablename;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not create policy % on table % (error: %)', policy_name, table_record.tablename, SQLERRM;
            END;
        ELSE
            RAISE NOTICE 'Policy % already exists on table: %', policy_name, table_record.tablename;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 3: GRANT ALL permissions to service_role on ALL tables
-- ============================================================================

DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT IN ('schema_migrations', '_prisma_migrations')
    LOOP
        BEGIN
            EXECUTE format('GRANT ALL ON public.%I TO service_role', table_record.tablename);
            RAISE NOTICE 'Granted ALL permissions on table: %', table_record.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not grant permissions on table % (error: %)', table_record.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 4: GRANT permissions on ALL sequences
-- ============================================================================

DO $$
DECLARE
    seq_record RECORD;
BEGIN
    FOR seq_record IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        BEGIN
            EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO service_role', seq_record.sequence_name);
            RAISE NOTICE 'Granted permissions on sequence: %', seq_record.sequence_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not grant permissions on sequence % (error: %)', seq_record.sequence_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 5: Specifically ensure user_settings_history has proper policies
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE user_settings_history ENABLE ROW LEVEL SECURITY;

-- Drop and recreate service_role policy (ensure it exists)
DROP POLICY IF EXISTS "service_role_full_access_user_settings_history" ON user_settings_history CASCADE;

CREATE POLICY "service_role_full_access_user_settings_history" ON user_settings_history
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Ensure authenticated users can read their own history
DROP POLICY IF EXISTS "users_read_own_settings_history" ON user_settings_history CASCADE;

CREATE POLICY "users_read_own_settings_history" ON user_settings_history
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Grant permissions explicitly
GRANT ALL ON user_settings_history TO service_role;
GRANT SELECT ON user_settings_history TO authenticated;

-- ============================================================================
-- VERIFICATION: Check user_settings_history specifically
-- ============================================================================

SELECT 
    'user_settings_history RLS enabled' as check_item,
    CASE WHEN c.relrowsecurity THEN 'YES' ELSE 'NO' END as status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'user_settings_history'

UNION ALL

SELECT 
    'service_role policy exists' as check_item,
    CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'user_settings_history'
AND policyname = 'service_role_full_access_user_settings_history'

UNION ALL

SELECT 
    'service_role has GRANT permissions' as check_item,
    CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as status
FROM information_schema.role_table_grants
WHERE grantee = 'service_role'
AND table_schema = 'public'
AND table_name = 'user_settings_history'
AND privilege_type = 'INSERT';

