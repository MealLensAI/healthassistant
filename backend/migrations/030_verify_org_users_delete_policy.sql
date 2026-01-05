-- Verify DELETE policy exists for service_role on organization_users
-- Run this in Supabase SQL Editor to check if the policy exists

SELECT 
    'Policy Check' as check_type,
    policyname,
    cmd,
    roles::text as roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'organization_users' 
AND cmd IN ('DELETE', 'ALL')
AND 'service_role' = ANY(roles::text[]);

-- If no results, run migration 025_fix_org_users_delete_policy.sql
