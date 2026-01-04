-- Quick test query to check if history records exist
-- Replace USER_ID_HERE with your actual user ID

SELECT 
    id,
    user_id,
    settings_type,
    created_at,
    jsonb_array_length(changed_fields) as num_changed_fields,
    changed_fields
FROM user_settings_history
WHERE user_id = 'USER_ID_HERE'  -- Replace with your user ID
ORDER BY created_at DESC
LIMIT 10;
