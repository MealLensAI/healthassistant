-- Migration: Fix RLS policies for ALL tables
-- Purpose: Ensure service_role (backend) has full access to all tables
--          and authenticated users can access their own data
-- Date: 2026-01-04
-- 
-- This migration fixes RLS issues once and for all by:
-- 1. Enabling RLS on all tables
-- 2. Granting service_role full access to everything
-- 3. Granting authenticated users access to their own data

-- ============================================================================
-- HELPER FUNCTION: Create service role policy for any table (only if exists)
-- ============================================================================

DO $$
DECLARE
    table_name TEXT;
    policy_name TEXT;
BEGIN
    -- List of all tables that need RLS policies
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('schema_migrations', '_prisma_migrations')
        ORDER BY tablename
    LOOP
        -- Process each table with error handling
        BEGIN
            -- Drop existing service_role policies
            policy_name := 'service_role_full_access_' || table_name;
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I CASCADE', policy_name, table_name);
            
            -- Enable RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
            
            -- Create service_role full access policy
            EXECUTE format('
                CREATE POLICY %I ON public.%I
                FOR ALL
                TO service_role
                USING (true)
                WITH CHECK (true)
            ', policy_name, table_name);
            
            -- Grant permissions
            EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name);
            
            RAISE NOTICE 'Created service_role policy for table: %', table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipped table % (error: %)', table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- MEAL_PLAN_MANAGEMENT TABLE
-- ============================================================================

ALTER TABLE meal_plan_management ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_meal_plans" ON meal_plan_management CASCADE;
DROP POLICY IF EXISTS "users_insert_own_meal_plans" ON meal_plan_management CASCADE;
DROP POLICY IF EXISTS "users_read_own_meal_plans" ON meal_plan_management CASCADE;
DROP POLICY IF EXISTS "users_update_own_meal_plans" ON meal_plan_management CASCADE;
DROP POLICY IF EXISTS "users_delete_own_meal_plans" ON meal_plan_management CASCADE;

CREATE POLICY "service_role_full_access_meal_plans" ON meal_plan_management
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "users_insert_own_meal_plans" ON meal_plan_management
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_read_own_meal_plans" ON meal_plan_management
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "users_update_own_meal_plans" ON meal_plan_management
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_delete_own_meal_plans" ON meal_plan_management
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_profiles" ON profiles CASCADE;
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles CASCADE;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles CASCADE;

CREATE POLICY "service_role_full_access_profiles" ON profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "users_read_own_profile" ON profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "users_update_own_profile" ON profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ============================================================================
-- USER_SETTINGS TABLE
-- ============================================================================

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_user_settings" ON user_settings CASCADE;
DROP POLICY IF EXISTS "users_insert_own_settings" ON user_settings CASCADE;
DROP POLICY IF EXISTS "users_read_own_settings" ON user_settings CASCADE;
DROP POLICY IF EXISTS "users_update_own_settings" ON user_settings CASCADE;
DROP POLICY IF EXISTS "users_delete_own_settings" ON user_settings CASCADE;

CREATE POLICY "service_role_full_access_user_settings" ON user_settings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "users_insert_own_settings" ON user_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_read_own_settings" ON user_settings
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "users_update_own_settings" ON user_settings
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_delete_own_settings" ON user_settings
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- USER_SETTINGS_HISTORY TABLE
-- ============================================================================

ALTER TABLE user_settings_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_user_settings_history" ON user_settings_history CASCADE;
DROP POLICY IF EXISTS "users_read_own_settings_history" ON user_settings_history CASCADE;
DROP POLICY IF EXISTS "users_delete_own_settings_history" ON user_settings_history CASCADE;

CREATE POLICY "service_role_full_access_user_settings_history" ON user_settings_history
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "users_read_own_settings_history" ON user_settings_history
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "users_delete_own_settings_history" ON user_settings_history
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- FEEDBACK TABLE
-- ============================================================================

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_feedback" ON feedback CASCADE;
DROP POLICY IF EXISTS "users_insert_own_feedback" ON feedback CASCADE;
DROP POLICY IF EXISTS "users_read_own_feedback" ON feedback CASCADE;

CREATE POLICY "service_role_full_access_feedback" ON feedback
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "users_insert_own_feedback" ON feedback
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_read_own_feedback" ON feedback
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- AI_SESSIONS TABLE (Skip if doesn't exist)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_sessions') THEN
        ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "service_role_full_access_ai_sessions" ON ai_sessions CASCADE;
        DROP POLICY IF EXISTS "users_insert_own_ai_sessions" ON ai_sessions CASCADE;
        DROP POLICY IF EXISTS "users_read_own_ai_sessions" ON ai_sessions CASCADE;
        DROP POLICY IF EXISTS "users_delete_own_ai_sessions" ON ai_sessions CASCADE;
        
        CREATE POLICY "service_role_full_access_ai_sessions" ON ai_sessions
            FOR ALL TO service_role USING (true) WITH CHECK (true);
        CREATE POLICY "users_insert_own_ai_sessions" ON ai_sessions
            FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
        CREATE POLICY "users_read_own_ai_sessions" ON ai_sessions
            FOR SELECT TO authenticated USING (user_id = auth.uid());
        CREATE POLICY "users_delete_own_ai_sessions" ON ai_sessions
            FOR DELETE TO authenticated USING (user_id = auth.uid());
        GRANT ALL ON ai_sessions TO service_role;
    END IF;
END $$;

-- ============================================================================
-- DETECTION_HISTORY TABLE
-- ============================================================================

ALTER TABLE detection_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_detection_history" ON detection_history CASCADE;
DROP POLICY IF EXISTS "users_insert_own_detection_history" ON detection_history CASCADE;
DROP POLICY IF EXISTS "users_read_own_detection_history" ON detection_history CASCADE;
DROP POLICY IF EXISTS "users_delete_own_detection_history" ON detection_history CASCADE;

CREATE POLICY "service_role_full_access_detection_history" ON detection_history
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "users_insert_own_detection_history" ON detection_history
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_read_own_detection_history" ON detection_history
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "users_delete_own_detection_history" ON detection_history
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- SESSIONS TABLE (Note: table is called "sessions", not "user_sessions")
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sessions') THEN
        ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "service_role_full_access_sessions" ON sessions CASCADE;
        DROP POLICY IF EXISTS "users_insert_own_sessions" ON sessions CASCADE;
        DROP POLICY IF EXISTS "users_read_own_sessions" ON sessions CASCADE;
        
        CREATE POLICY "service_role_full_access_sessions" ON sessions
            FOR ALL TO service_role USING (true) WITH CHECK (true);
        CREATE POLICY "users_insert_own_sessions" ON sessions
            FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
        CREATE POLICY "users_read_own_sessions" ON sessions
            FOR SELECT TO authenticated USING (user_id = auth.uid());
        GRANT ALL ON sessions TO service_role;
    END IF;
END $$;

-- ============================================================================
-- SUBSCRIPTION_PLANS TABLE
-- ============================================================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_subscription_plans" ON subscription_plans CASCADE;
DROP POLICY IF EXISTS "users_read_subscription_plans" ON subscription_plans CASCADE;

CREATE POLICY "service_role_full_access_subscription_plans" ON subscription_plans
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- All authenticated users can read subscription plans (public info)
CREATE POLICY "users_read_subscription_plans" ON subscription_plans
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- ============================================================================
-- USER_SUBSCRIPTIONS TABLE
-- ============================================================================

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_user_subscriptions" ON user_subscriptions CASCADE;
DROP POLICY IF EXISTS "users_read_own_subscriptions" ON user_subscriptions CASCADE;

CREATE POLICY "service_role_full_access_user_subscriptions" ON user_subscriptions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "users_read_own_subscriptions" ON user_subscriptions
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- INVITATIONS TABLE (Explicit handling to ensure it works)
-- ============================================================================

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies for invitations
DROP POLICY IF EXISTS "service_role_full_access_invitations" ON invitations CASCADE;
DROP POLICY IF EXISTS "service_role_can_insert_invitations" ON invitations CASCADE;
DROP POLICY IF EXISTS "service_role_can_select_invitations" ON invitations CASCADE;
DROP POLICY IF EXISTS "service_role_can_update_invitations" ON invitations CASCADE;
DROP POLICY IF EXISTS "service_role_can_delete_invitations" ON invitations CASCADE;
DROP POLICY IF EXISTS "users_read_own_invitations" ON invitations CASCADE;
DROP POLICY IF EXISTS "users_create_enterprises" ON invitations CASCADE;
DROP POLICY IF EXISTS "owners_can_insert_invitations" ON invitations CASCADE;
DROP POLICY IF EXISTS "owners_can_read_invitations" ON invitations CASCADE;
DROP POLICY IF EXISTS "owners_can_update_invitations" ON invitations CASCADE;
DROP POLICY IF EXISTS "owners_can_delete_invitations" ON invitations CASCADE;
DROP POLICY IF EXISTS "invited_users_can_read_own_invitation" ON invitations CASCADE;

-- Create comprehensive service_role policy (FOR ALL operations)
CREATE POLICY "service_role_full_access_invitations" ON invitations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Also create specific policies for each operation (redundant but ensures coverage)
CREATE POLICY "service_role_can_insert_invitations" ON invitations
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "service_role_can_select_invitations" ON invitations
    FOR SELECT
    TO service_role
    USING (true);

CREATE POLICY "service_role_can_update_invitations" ON invitations
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service_role_can_delete_invitations" ON invitations
    FOR DELETE
    TO service_role
    USING (true);

-- Allow authenticated users to read their own invitations
CREATE POLICY "users_read_own_invitations" ON invitations
    FOR SELECT
    TO authenticated
    USING (email = auth.email() OR invited_by = auth.uid());

-- Grant explicit permissions
GRANT ALL ON invitations TO service_role;

-- ============================================================================
-- ENTERPRISES TABLE (Explicit handling to ensure it works)
-- ============================================================================

ALTER TABLE enterprises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_enterprises" ON enterprises CASCADE;
DROP POLICY IF EXISTS "users_read_own_enterprises" ON enterprises CASCADE;
DROP POLICY IF EXISTS "users_create_enterprises" ON enterprises CASCADE;

CREATE POLICY "service_role_full_access_enterprises" ON enterprises
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "users_read_own_enterprises" ON enterprises
    FOR SELECT
    TO authenticated
    USING (created_by = auth.uid());

CREATE POLICY "users_create_enterprises" ON enterprises
    FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());

GRANT ALL ON enterprises TO service_role;

-- ============================================================================
-- ORGANIZATION_USERS TABLE (Explicit handling to ensure it works)
-- ============================================================================

ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_org_users" ON organization_users CASCADE;
DROP POLICY IF EXISTS "users_read_own_membership" ON organization_users CASCADE;

CREATE POLICY "service_role_full_access_org_users" ON organization_users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "users_read_own_membership" ON organization_users
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

GRANT ALL ON organization_users TO service_role;

-- ============================================================================
-- USER_PRODUCT_PREFERENCES TABLE (Skip if doesn't exist)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_product_preferences') THEN
        ALTER TABLE user_product_preferences ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "service_role_full_access_user_product_preferences" ON user_product_preferences CASCADE;
        DROP POLICY IF EXISTS "users_insert_own_preferences" ON user_product_preferences CASCADE;
        DROP POLICY IF EXISTS "users_read_own_preferences" ON user_product_preferences CASCADE;
        DROP POLICY IF EXISTS "users_update_own_preferences" ON user_product_preferences CASCADE;
        
        CREATE POLICY "service_role_full_access_user_product_preferences" ON user_product_preferences
            FOR ALL TO service_role USING (true) WITH CHECK (true);
        CREATE POLICY "users_insert_own_preferences" ON user_product_preferences
            FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
        CREATE POLICY "users_read_own_preferences" ON user_product_preferences
            FOR SELECT TO authenticated USING (user_id = auth.uid());
        CREATE POLICY "users_update_own_preferences" ON user_product_preferences
            FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
        GRANT ALL ON user_product_preferences TO service_role;
    END IF;
END $$;

-- ============================================================================
-- ADDITIONAL TABLES (Explicit handling for tables not covered above)
-- ============================================================================

-- FEATURE_USAGE TABLE
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_feature_usage" ON feature_usage CASCADE;
CREATE POLICY "service_role_full_access_feature_usage" ON feature_usage
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "users_read_own_feature_usage" ON feature_usage
    FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT ALL ON feature_usage TO service_role;

-- PAYMENT_TRANSACTIONS TABLE
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_payment_transactions" ON payment_transactions CASCADE;
CREATE POLICY "service_role_full_access_payment_transactions" ON payment_transactions
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "users_read_own_payment_transactions" ON payment_transactions
    FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT ALL ON payment_transactions TO service_role;

-- PAYSTACK_WEBHOOKS TABLE (Backend only - no user access needed)
ALTER TABLE paystack_webhooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_paystack_webhooks" ON paystack_webhooks CASCADE;
CREATE POLICY "service_role_full_access_paystack_webhooks" ON paystack_webhooks
    FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON paystack_webhooks TO service_role;

-- PENDING_MEAL_PLANS TABLE
ALTER TABLE pending_meal_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_pending_meal_plans" ON pending_meal_plans CASCADE;
CREATE POLICY "service_role_full_access_pending_meal_plans" ON pending_meal_plans
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "users_read_own_pending_meal_plans" ON pending_meal_plans
    FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT ALL ON pending_meal_plans TO service_role;

-- SESSIONS TABLE (already handled above, skipping duplicate)

-- SHARED_RECIPES TABLE
ALTER TABLE shared_recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_shared_recipes" ON shared_recipes CASCADE;
CREATE POLICY "service_role_full_access_shared_recipes" ON shared_recipes
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "users_insert_own_shared_recipes" ON shared_recipes
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users_read_own_shared_recipes" ON shared_recipes
    FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT ALL ON shared_recipes TO service_role;

-- USAGE_TRACKING TABLE
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_usage_tracking" ON usage_tracking CASCADE;
CREATE POLICY "service_role_full_access_usage_tracking" ON usage_tracking
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "users_read_own_usage_tracking" ON usage_tracking
    FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT ALL ON usage_tracking TO service_role;

-- USER_TRIALS TABLE
ALTER TABLE user_trials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_user_trials" ON user_trials CASCADE;
CREATE POLICY "service_role_full_access_user_trials" ON user_trials
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "users_read_own_user_trials" ON user_trials
    FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT ALL ON user_trials TO service_role;

-- ============================================================================
-- GRANT PERMISSIONS TO SERVICE_ROLE
-- ============================================================================

-- Grant all necessary permissions to service_role on all tables
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('schema_migrations', '_prisma_migrations')
    LOOP
        EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name);
        RAISE NOTICE 'Granted permissions to service_role for table: %', table_name;
    END LOOP;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- List all tables with RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public' 
AND tablename NOT IN ('schema_migrations', '_prisma_migrations')
ORDER BY tablename;

-- List all service_role policies
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE policyname LIKE 'service_role%'
ORDER BY tablename, policyname;

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. Service role (backend) has FULL ACCESS to all tables
-- 2. Authenticated users can only access their own data (user_id = auth.uid())
-- 3. Backend handles all permission checks in code
-- 4. This ensures no more RLS violations for backend operations
-- 5. Users can still access their own data directly if needed

