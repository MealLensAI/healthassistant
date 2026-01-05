-- Create an RPC function to delete organization_users by ID
-- This bypasses any potential RLS issues by executing as the function owner

CREATE OR REPLACE FUNCTION delete_organization_user(p_user_relation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete the record
    DELETE FROM organization_users WHERE id = p_user_relation_id;
    
    -- Get the number of rows deleted
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Return true if a row was deleted
    RETURN deleted_count > 0;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and return false
        RAISE WARNING 'Error deleting organization_user %: %', p_user_relation_id, SQLERRM;
        RETURN FALSE;
END;
$$;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION delete_organization_user(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION delete_organization_user(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION delete_organization_user(UUID) IS 'Deletes an organization_users record by ID. Uses SECURITY DEFINER to bypass RLS.';

