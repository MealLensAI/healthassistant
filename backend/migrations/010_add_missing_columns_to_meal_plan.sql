-- Migration: Add missing columns to meal_plan_management table
-- Run this in Supabase SQL Editor

-- Add health_assessment column (JSONB to store health metrics)
ALTER TABLE meal_plan_management 
ADD COLUMN IF NOT EXISTS health_assessment JSONB;

-- Add user_info column (JSONB to store user info used for the plan)
ALTER TABLE meal_plan_management 
ADD COLUMN IF NOT EXISTS user_info JSONB;

-- Add has_sickness column
ALTER TABLE meal_plan_management 
ADD COLUMN IF NOT EXISTS has_sickness BOOLEAN DEFAULT FALSE;

-- Add sickness_type column
ALTER TABLE meal_plan_management 
ADD COLUMN IF NOT EXISTS sickness_type TEXT DEFAULT '';

-- Add is_approved column (for enterprise approval workflow)
ALTER TABLE meal_plan_management 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;

-- Add comments
COMMENT ON COLUMN meal_plan_management.health_assessment IS 'Health assessment data including BMR, daily_calories, whtr, whtr_category';
COMMENT ON COLUMN meal_plan_management.user_info IS 'User info used to generate the plan: age, weight, height, gender, goal, condition';
COMMENT ON COLUMN meal_plan_management.has_sickness IS 'Whether the plan was generated for a health condition';
COMMENT ON COLUMN meal_plan_management.sickness_type IS 'The type of health condition (e.g., diabetes, hypertension)';
COMMENT ON COLUMN meal_plan_management.is_approved IS 'Whether the meal plan is approved and visible to the user. Admin-created plans start as FALSE.';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_meal_plan_is_approved ON meal_plan_management(is_approved);
CREATE INDEX IF NOT EXISTS idx_meal_plan_has_sickness ON meal_plan_management(has_sickness);

