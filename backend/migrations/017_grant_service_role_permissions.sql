-- Grant service_role table-level permissions on all tables
-- RLS policies control row-level access, but GRANT statements are needed for table-level permissions

-- ============================================================================
-- GRANT ALL PERMISSIONS TO service_role ON ALL TABLES
-- ============================================================================

-- Invitations table (priority fix for current error)
GRANT ALL ON invitations TO service_role;
GRANT USAGE, SELECT ON SEQUENCE invitations_id_seq TO service_role;

-- Meal plan management
GRANT ALL ON meal_plan_management TO service_role;
GRANT USAGE, SELECT ON SEQUENCE meal_plan_management_id_seq TO service_role;

-- Organizations/Enterprises
GRANT ALL ON enterprises TO service_role;
GRANT USAGE, SELECT ON SEQUENCE enterprises_id_seq TO service_role;

GRANT ALL ON organization_users TO service_role;
GRANT USAGE, SELECT ON SEQUENCE organization_users_id_seq TO service_role;

-- User settings
GRANT ALL ON user_settings TO service_role;
GRANT USAGE, SELECT ON SEQUENCE user_settings_id_seq TO service_role;

GRANT ALL ON user_settings_history TO service_role;
GRANT USAGE, SELECT ON SEQUENCE user_settings_history_id_seq TO service_role;

-- Profiles
GRANT ALL ON profiles TO service_role;
GRANT USAGE, SELECT ON SEQUENCE profiles_id_seq TO service_role;

-- All other tables (generic grants)
DO $$
DECLARE
    table_record RECORD;
    seq_record RECORD;
BEGIN
    -- Grant permissions on all tables in public schema
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT IN ('schema_migrations', '_prisma_migrations')
    LOOP
        BEGIN
            EXECUTE format('GRANT ALL ON public.%I TO service_role', table_record.tablename);
            RAISE NOTICE 'Granted permissions on table: %', table_record.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not grant permissions on table % (error: %)', table_record.tablename, SQLERRM;
        END;
    END LOOP;
    
    -- Grant permissions on all sequences
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
-- VERIFICATION - Check service_role permissions
-- ============================================================================
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'service_role'
AND table_schema = 'public'
AND table_name IN ('invitations', 'meal_plan_management', 'enterprises', 'organization_users')
ORDER BY table_name, privilege_type;

