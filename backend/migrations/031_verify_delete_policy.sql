-- Verify DELETE policy exists for service_role on organization_users
-- Run this to check if the policy is correctly set up

-- Check policies
SELECT 
    'Policy Check' as check_type,
    policyname,
    cmd,
    roles::text as roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'organization_users' 
AND (cmd = 'DELETE' OR cmd = 'ALL')
AND 'service_role' = ANY(roles::text[]);

-- Expected result: Should see a policy with cmd='ALL' for service_role

-- If no results, the policy doesn't exist. Run migration 025_fix_org_users_delete_policy.sql

