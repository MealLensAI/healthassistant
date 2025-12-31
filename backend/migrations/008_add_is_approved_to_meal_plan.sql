-- Migration: Add is_approved column to meal_plan_management table
-- This column tracks whether an admin has approved the meal plan for user visibility
-- Default is false - meal plans must be explicitly approved before users can see them

ALTER TABLE meal_plan_management 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

-- Update existing meal plans to be approved by default (for backwards compatibility)
-- Existing plans were already visible to users, so they should remain visible
UPDATE meal_plan_management 
SET is_approved = TRUE 
WHERE is_approved IS NULL OR is_approved = FALSE;

-- Add a comment to the column for documentation
COMMENT ON COLUMN meal_plan_management.is_approved IS 'Whether the meal plan has been approved by admin and is visible to the user';

