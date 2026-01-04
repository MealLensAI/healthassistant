-- Check if user exists in organization_users and verify the relationship
-- Replace USER_RELATION_ID with: 688d092e-ee3f-4052-a250-38677bbb6e16

-- ============================================================================
-- CHECK USER IN ORGANIZATION_USERS
-- ============================================================================

-- Check if the record exists
SELECT 
    id,
    user_id,
    enterprise_id,
    role
FROM organization_users
WHERE id = '688d092e-ee3f-4052-a250-38677bbb6e16';

-- ============================================================================
-- CHECK THE USER_ID IN AUTH.USERS
-- ============================================================================

-- Get the user_id from organization_users first, then check auth.users
-- (Note: You may need to check auth.users separately if you have access)

SELECT 
    ou.id as org_user_id,
    ou.user_id,
    ou.enterprise_id,
    ou.role,
    e.name as enterprise_name,
    e.created_by as enterprise_owner_id
FROM organization_users ou
LEFT JOIN enterprises e ON e.id = ou.enterprise_id
WHERE ou.id = '688d092e-ee3f-4052-a250-38677bbb6e16';

-- ============================================================================
-- CHECK FOR FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Check if there are any foreign key constraints that might prevent deletion
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'organization_users'
    AND ccu.table_name != 'organization_users';

-- ============================================================================
-- CHECK IF USER HAS DEPENDENT RECORDS
-- ============================================================================

-- Get the user_id from organization_users to check for dependent records
DO $$
DECLARE
    v_user_id UUID;
    v_org_user_id UUID := '688d092e-ee3f-4052-a250-38677bbb6e16';
BEGIN
    -- Get user_id
    SELECT user_id INTO v_user_id
    FROM organization_users
    WHERE id = v_org_user_id;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User relation ID % not found in organization_users', v_org_user_id;
    ELSE
        RAISE NOTICE 'Found user_id: %', v_user_id;
        
        -- Check for dependent records
        RAISE NOTICE 'Checking for dependent records...';
        
        -- Check user_settings
        IF EXISTS (SELECT 1 FROM user_settings WHERE user_id = v_user_id) THEN
            RAISE NOTICE 'User has records in user_settings';
        END IF;
        
        -- Check user_settings_history
        IF EXISTS (SELECT 1 FROM user_settings_history WHERE user_id = v_user_id) THEN
            RAISE NOTICE 'User has records in user_settings_history';
        END IF;
        
        -- Check meal_plan_management
        IF EXISTS (SELECT 1 FROM meal_plan_management WHERE user_id = v_user_id) THEN
            RAISE NOTICE 'User has records in meal_plan_management';
        END IF;
        
        -- Check detection_history
        IF EXISTS (SELECT 1 FROM detection_history WHERE user_id = v_user_id) THEN
            RAISE NOTICE 'User has records in detection_history';
        END IF;
        
        -- Check invitations (if user was invited)
        IF EXISTS (SELECT 1 FROM invitations WHERE email = (SELECT email FROM auth.users WHERE id = v_user_id LIMIT 1)) THEN
            RAISE NOTICE 'User has records in invitations';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- CHECK RLS POLICIES FOR DELETE
-- ============================================================================

SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'organization_users'
AND (cmd = 'DELETE' OR cmd = 'ALL')
ORDER BY policyname;

