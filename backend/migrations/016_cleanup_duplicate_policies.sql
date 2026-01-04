-- Cleanup: Remove duplicate RLS policies
-- Some tables have duplicate policies from multiple migrations
-- This cleans them up to keep only the correct ones

-- ============================================================================
-- DETECTION_HISTORY - Remove duplicate policy
-- ============================================================================
DROP POLICY IF EXISTS "service_role_all_detection_history" ON detection_history CASCADE;

-- ============================================================================
-- MEAL_PLAN_MANAGEMENT - Remove duplicate policy (keep service_role_full_access_meal_plans)
-- ============================================================================
DROP POLICY IF EXISTS "service_role_full_access_meal_plan_management" ON meal_plan_management CASCADE;

-- ============================================================================
-- ORGANIZATION_USERS - Remove duplicate policies
-- ============================================================================
DROP POLICY IF EXISTS "service_role_all_organization_users" ON organization_users CASCADE;
DROP POLICY IF EXISTS "service_role_full_access_organization_users" ON organization_users CASCADE;
-- Keep: service_role_full_access_org_users

-- ============================================================================
-- USER_SETTINGS - Remove duplicate policy
-- ============================================================================
DROP POLICY IF EXISTS "service_role_all_user_settings" ON user_settings CASCADE;
-- Keep: service_role_full_access_user_settings

-- ============================================================================
-- USER_SETTINGS_HISTORY - Remove duplicate policy
-- ============================================================================
DROP POLICY IF EXISTS "service_role_all_settings_history" ON user_settings_history CASCADE;
-- Keep: service_role_full_access_user_settings_history

-- ============================================================================
-- VERIFICATION - List all remaining service_role policies
-- ============================================================================
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE policyname LIKE 'service_role%'
ORDER BY tablename, policyname;


