-- Simple SQL to delete the stuck user
-- User Relation ID: 688d092e-ee3f-4052-a250-38677bbb6e16

-- Delete the user from organization_users table
DELETE FROM organization_users
WHERE id = '688d092e-ee3f-4052-a250-38677bbb6e16';

-- Verify deletion
SELECT id, user_id, enterprise_id 
FROM organization_users 
WHERE id = '688d092e-ee3f-4052-a250-38677bbb6e16';
-- Should return 0 rows


