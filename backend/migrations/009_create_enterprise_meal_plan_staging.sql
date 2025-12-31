-- Migration: Add is_approved column to meal_plan_management table
-- This column tracks whether a meal plan has been approved by admin
-- - User-created plans: is_approved = TRUE (auto-approved)
-- - Admin-created plans: is_approved = FALSE until approved
-- - Users only see plans where is_approved = TRUE

-- Add the is_approved column
ALTER TABLE meal_plan_management 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;

-- Update existing plans to be approved (backwards compatibility)
UPDATE meal_plan_management 
SET is_approved = TRUE 
WHERE is_approved IS NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_meal_plan_is_approved ON meal_plan_management(is_approved);

COMMENT ON COLUMN meal_plan_management.is_approved IS 'Whether the meal plan is approved and visible to the user. Admin-created plans start as FALSE.';

