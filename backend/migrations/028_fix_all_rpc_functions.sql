-- ═══════════════════════════════════════════════════════════════════
-- FIX ALL RPC FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════
-- This migration fixes all RPC functions in the database:
-- 1. upsert_user_settings - Fixes history creation with better error handling
-- 2. upsert_user_product_preference - Ensures proper error handling
-- 3. get_user_settings - If it exists, ensure it's working correctly
-- Date: 2026-01-04

-- ═══════════════════════════════════════════════════════════════════
-- 1. FIX upsert_user_settings FUNCTION
-- ═══════════════════════════════════════════════════════════════════
-- This function should ALWAYS create history entries
DROP FUNCTION IF EXISTS public.upsert_user_settings(UUID, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.upsert_user_settings(
    p_user_id UUID,
    p_settings_type TEXT,
    p_settings_data JSONB
)
RETURNS TABLE (
    status TEXT,
    message TEXT,
    settings_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    settings_id UUID;
    existing_data JSONB;
    changed_fields TEXT[] := ARRAY[]::TEXT[];
    key TEXT;
    history_insert_success BOOLEAN := FALSE;
    history_error TEXT;
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL THEN
        RETURN QUERY SELECT 
            'error'::TEXT as status,
            'User ID is required'::TEXT as message,
            NULL::UUID as settings_id;
        RETURN;
    END IF;
    
    IF p_settings_type IS NULL OR p_settings_type = '' THEN
        RETURN QUERY SELECT 
            'error'::TEXT as status,
            'Settings type is required'::TEXT as message,
            NULL::UUID as settings_id;
        RETURN;
    END IF;
    
    -- Get existing settings data if it exists
    SELECT settings_data INTO existing_data
    FROM public.user_settings
    WHERE user_id = p_user_id AND settings_type = p_settings_type;
    
    -- If updating, detect changed fields
    IF existing_data IS NOT NULL THEN
        -- Compare JSONB objects to find changed fields
        FOR key IN SELECT jsonb_object_keys(p_settings_data)
        LOOP
            IF existing_data->>key IS DISTINCT FROM p_settings_data->>key THEN
                changed_fields := array_append(changed_fields, key);
            END IF;
        END LOOP;
        
        -- Also check for removed fields
        FOR key IN SELECT jsonb_object_keys(existing_data)
        LOOP
            IF NOT (p_settings_data ? key) THEN
                changed_fields := array_append(changed_fields, key || ' (removed)');
            END IF;
        END LOOP;
    ELSE
        -- First insert - all fields are new
        FOR key IN SELECT jsonb_object_keys(p_settings_data)
        LOOP
            changed_fields := array_append(changed_fields, key);
        END LOOP;
    END IF;
    
    -- Upsert the settings (this MUST succeed)
    BEGIN
        INSERT INTO public.user_settings (user_id, settings_type, settings_data, created_at, updated_at)
        VALUES (p_user_id, p_settings_type, p_settings_data, NOW(), NOW())
        ON CONFLICT (user_id, settings_type)
        DO UPDATE SET
            settings_data = EXCLUDED.settings_data,
            updated_at = NOW()
        RETURNING id INTO settings_id;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            'error'::TEXT as status,
            ('Failed to save settings: ' || SQLERRM)::TEXT as message,
            NULL::UUID as settings_id;
        RETURN;
    END;
    
    -- Save to history (always, even for first insert)
    -- Use explicit error handling to catch any issues
    BEGIN
        INSERT INTO public.user_settings_history (
            user_id,
            settings_type,
            settings_data,
            previous_settings_data,
            changed_fields,
            created_at,
            created_by
        )
        VALUES (
            p_user_id,
            p_settings_type,
            p_settings_data,
            COALESCE(existing_data, '{}'::jsonb),
            changed_fields,
            NOW(),
            p_user_id
        );
        history_insert_success := TRUE;
    EXCEPTION WHEN OTHERS THEN
        history_error := SQLERRM;
        -- Log the error (will appear in PostgreSQL logs)
        RAISE WARNING 'Failed to insert history for user %: %', p_user_id, history_error;
        -- Continue anyway - don't fail the entire operation
    END;
    
    -- Return success status
    IF history_insert_success THEN
        RETURN QUERY SELECT 
            'success'::TEXT as status,
            'Settings saved successfully'::TEXT as message,
            settings_id;
    ELSE
        -- Settings saved but history failed
        RETURN QUERY SELECT 
            'success'::TEXT as status,
            ('Settings saved but history creation failed: ' || COALESCE(history_error, 'Unknown error'))::TEXT as message,
            settings_id;
    END IF;
        
EXCEPTION WHEN OTHERS THEN
    -- Catch-all for any other unexpected errors
    RETURN QUERY SELECT 
        'error'::TEXT as status,
        SQLERRM::TEXT as message,
        NULL::UUID as settings_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.upsert_user_settings(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_user_settings(UUID, TEXT, JSONB) TO service_role;

-- ═══════════════════════════════════════════════════════════════════
-- 2. FIX upsert_user_product_preference FUNCTION
-- ═══════════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.upsert_user_product_preference(UUID, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION public.upsert_user_product_preference(
    p_user_id UUID,
    p_product_type TEXT,
    p_has_health_condition BOOLEAN
)
RETURNS TABLE (
    status TEXT,
    message TEXT,
    preference_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    preference_id UUID;
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL THEN
        RETURN QUERY SELECT 
            'error'::TEXT as status,
            'User ID is required'::TEXT as message,
            NULL::UUID as preference_id;
        RETURN;
    END IF;
    
    -- Validate product_type
    IF p_product_type NOT IN ('cooking', 'health') THEN
        RETURN QUERY SELECT 
            'error'::TEXT as status,
            'Invalid product_type. Must be "cooking" or "health"'::TEXT as message,
            NULL::UUID as preference_id;
        RETURN;
    END IF;
    
    -- Upsert the preference
    BEGIN
        INSERT INTO public.user_product_preferences (
            user_id,
            product_type,
            has_health_condition,
            created_at,
            updated_at
        )
        VALUES (
            p_user_id,
            p_product_type,
            COALESCE(p_has_health_condition, FALSE),
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id, product_type)
        DO UPDATE SET
            has_health_condition = EXCLUDED.has_health_condition,
            updated_at = NOW()
        RETURNING id INTO preference_id;
        
        RETURN QUERY SELECT 
            'success'::TEXT as status,
            'Preference saved successfully'::TEXT as message,
            preference_id;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            'error'::TEXT as status,
            ('Failed to save preference: ' || SQLERRM)::TEXT as message,
            NULL::UUID as preference_id;
    END;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.upsert_user_product_preference(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_user_product_preference(UUID, TEXT, BOOLEAN) TO service_role;

-- ═══════════════════════════════════════════════════════════════════
-- 3. VERIFY ALL FUNCTIONS EXIST AND ARE CORRECTLY CONFIGURED
-- ═══════════════════════════════════════════════════════════════════
SELECT 
    'RPC Functions Status' as check_type,
    proname as function_name,
    CASE 
        WHEN proname = 'upsert_user_settings' AND prosrc LIKE '%user_settings_history%' THEN '✅ History creation enabled'
        WHEN proname = 'upsert_user_settings' THEN '⚠️ Missing history creation'
        WHEN proname = 'upsert_user_product_preference' THEN '✅ Configured'
        ELSE '✅ Exists'
    END as status
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('upsert_user_settings', 'upsert_user_product_preference')
ORDER BY proname;

-- ═══════════════════════════════════════════════════════════════════
-- 4. VERIFY PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════
SELECT 
    'Function Permissions' as check_type,
    p.proname as function_name,
    r.rolname as role_name,
    CASE WHEN has_function_privilege(r.rolname, p.oid, 'EXECUTE') THEN '✅' ELSE '❌' END as can_execute
FROM pg_proc p
CROSS JOIN pg_roles r
WHERE p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND p.proname IN ('upsert_user_settings', 'upsert_user_product_preference')
AND r.rolname IN ('authenticated', 'service_role')
ORDER BY p.proname, r.rolname;

