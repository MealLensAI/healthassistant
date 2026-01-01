-- Migration: Add created_by column to meal_plan_management table
-- This column tracks who created the meal plan (user_id if created by user, admin_id if created by admin)
-- This helps enterprise admins distinguish between user-created and admin-created meal plans

-- Add the created_by column
ALTER TABLE meal_plan_management 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update existing plans to set created_by = user_id (backwards compatibility)
-- For existing plans, assume they were created by the user
UPDATE meal_plan_management 
SET created_by = user_id 
WHERE created_by IS NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_meal_plan_created_by ON meal_plan_management(created_by);

-- Add comment
COMMENT ON COLUMN meal_plan_management.created_by IS 'User ID of who created this meal plan. If created_by = user_id, the user created it themselves. If created_by != user_id, an admin created it for the user.';

