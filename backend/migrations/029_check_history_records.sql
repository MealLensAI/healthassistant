-- Check if history records exist for a user
-- Use this to verify history is being created

SELECT 
    id,
    created_at,
    array_length(changed_fields, 1) as num_changed_fields,
    changed_fields,
    CASE 
        WHEN previous_settings_data IS NULL THEN 'First save'
        ELSE 'Update'
    END as record_type
FROM user_settings_history
WHERE user_id = 'aeede511-3ade-4a01-a5f0-900355904e36'
AND settings_type = 'health_profile'
ORDER BY created_at DESC
LIMIT 10;

-- Also check count
SELECT 
    COUNT(*) as total_history_records
FROM user_settings_history
WHERE user_id = 'aeede511-3ade-4a01-a5f0-900355904e36'
AND settings_type = 'health_profile';

