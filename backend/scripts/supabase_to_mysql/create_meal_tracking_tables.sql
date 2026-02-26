-- Run this in the Supabase SQL Editor to create meal tracking tables

-- meal_tracking: tracks if users have cooked/eaten their meals
CREATE TABLE IF NOT EXISTS meal_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    meal_plan_id UUID NOT NULL,
    day VARCHAR(20) NOT NULL,
    meal_type VARCHAR(20) NOT NULL,
    cooked_at TIMESTAMPTZ NULL,
    eaten_at TIMESTAMPTZ NULL,
    reminder_sent_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, meal_plan_id, day, meal_type)
);

CREATE INDEX IF NOT EXISTS idx_meal_tracking_user_id ON meal_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_tracking_meal_plan_id ON meal_tracking(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_tracking_cooked_at ON meal_tracking(cooked_at);

-- Disable RLS so the service role key can access the table
ALTER TABLE meal_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on meal_tracking"
ON meal_tracking FOR ALL
USING (true)
WITH CHECK (true);

-- meal_reminder_settings: user preferences for meal reminders
CREATE TABLE IF NOT EXISTS meal_reminder_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    reminders_enabled BOOLEAN DEFAULT true,
    breakfast_reminder_time TIME DEFAULT '08:00:00',
    lunch_reminder_time TIME DEFAULT '12:00:00',
    dinner_reminder_time TIME DEFAULT '18:00:00',
    followup_delay_hours INT DEFAULT 2,
    timezone VARCHAR(64) DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_reminder_settings_user_id ON meal_reminder_settings(user_id);

ALTER TABLE meal_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on meal_reminder_settings"
ON meal_reminder_settings FOR ALL
USING (true)
WITH CHECK (true);
