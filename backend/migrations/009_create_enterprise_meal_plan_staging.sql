-- Migration: Create enterprise_meal_plan_staging table
-- This table holds meal plans created by admins that are pending approval
-- Once approved, plans are moved to the user's meal_plan_management table

CREATE TABLE IF NOT EXISTS enterprise_meal_plan_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT,
    start_date DATE,
    end_date DATE,
    meal_plan JSONB,
    has_sickness BOOLEAN DEFAULT FALSE,
    sickness_type TEXT,
    health_assessment JSONB,
    user_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_staging_enterprise_id ON enterprise_meal_plan_staging(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_staging_user_id ON enterprise_meal_plan_staging(user_id);
CREATE INDEX IF NOT EXISTS idx_staging_admin_id ON enterprise_meal_plan_staging(admin_id);

-- Add RLS policies
ALTER TABLE enterprise_meal_plan_staging ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage staging plans for their enterprise
CREATE POLICY "Enterprise admins can manage staging plans"
ON enterprise_meal_plan_staging
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM organization_users ou
        WHERE ou.enterprise_id = enterprise_meal_plan_staging.enterprise_id
        AND ou.user_id = auth.uid()
        AND ou.role IN ('owner', 'admin')
    )
);

COMMENT ON TABLE enterprise_meal_plan_staging IS 'Staging area for admin-created meal plans pending approval';

