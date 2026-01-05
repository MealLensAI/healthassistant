-- Check if delete_organization_user RPC function exists
SELECT 
    'Function Check' as check_type,
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'delete_organization_user';

-- If no results, the function doesn't exist. Run migration 032_create_delete_org_user_rpc.sql

