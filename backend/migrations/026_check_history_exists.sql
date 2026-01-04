-- Check if history records exist for a user
-- Replace USER_ID with your actual user ID: aeede511-3ade-4a01-a5f0-900355904e36

SELECT 
    id,
    user_id,
    settings_type,
    created_at,
    jsonb_array_length(changed_fields) as num_changed_fields,
    changed_fields
FROM user_settings_history
WHERE user_id = 'aeede511-3ade-4a01-a5f0-900355904e36'
AND settings_type = 'health_profile'
ORDER BY created_at DESC
LIMIT 10;

-- Also check if the RPC function exists and has history creation code
SELECT 
    prosrc
FROM pg_proc
WHERE proname = 'upsert_user_settings'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

