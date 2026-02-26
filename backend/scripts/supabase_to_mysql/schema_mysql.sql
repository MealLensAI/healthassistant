-- MySQL schema blueprint: Supabase (PostgreSQL) → MySQL
-- Inferred from healthassistant backend usage. Run this on your MySQL server
-- before or as part of the migration script to create tables.
-- Character set supports emoji and international text.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- auth_users: local auth (replaces Supabase auth)
CREATE TABLE IF NOT EXISTS auth_users (
    id CHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NULL,
    avatar_url VARCHAR(2048) NULL,
    user_metadata JSON NULL,
    email_confirmed_at DATETIME(6) NULL,
    last_sign_in_at DATETIME(6) NULL,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE INDEX uq_auth_users_email (email),
    INDEX idx_auth_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- refresh_tokens: optional; for long-lived refresh flow
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_refresh_tokens_user_id (user_id),
    INDEX idx_refresh_tokens_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- password_reset_tokens: for forgot-password flow
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    used_at DATETIME(6) NULL,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_password_reset_user (user_id),
    INDEX idx_password_reset_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- feedback
CREATE TABLE IF NOT EXISTS feedback (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NULL,
    feedback_text TEXT NULL,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_feedback_user_id (user_id),
    INDEX idx_feedback_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ai_sessions
CREATE TABLE IF NOT EXISTS ai_sessions (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    prompt TEXT NULL,
    response LONGTEXT NULL,
    timestamp DATETIME(6) NULL,
    metadata JSON NULL,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_ai_sessions_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- detection_history
CREATE TABLE IF NOT EXISTS detection_history (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    recipe_type VARCHAR(255) NULL,
    suggestion TEXT NULL,
    instructions TEXT NULL,
    ingredients TEXT NULL,
    detected_foods TEXT NULL,
    analysis_id VARCHAR(255) NULL,
    youtube TEXT NULL,
    `google` TEXT NULL,
    resources JSON NULL,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_detection_history_user_id (user_id),
    INDEX idx_detection_history_analysis_id (analysis_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- profiles (mirrors Supabase public.profiles, often synced from auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id CHAR(36) NOT NULL,
    email VARCHAR(255) NULL,
    full_name VARCHAR(255) NULL,
    avatar_url VARCHAR(2048) NULL,
    firebase_uid VARCHAR(255) NULL,
    created_at DATETIME(6) NULL,
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    INDEX idx_profiles_email (email),
    INDEX idx_profiles_firebase_uid (firebase_uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- meal_plan_management
CREATE TABLE IF NOT EXISTS meal_plan_management (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    name VARCHAR(255) NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    meal_plan JSON NULL,
    has_sickness TINYINT(1) NULL DEFAULT 0,
    sickness_type VARCHAR(255) NULL,
    is_approved TINYINT(1) NULL DEFAULT 0,
    health_assessment JSON NULL,
    user_info JSON NULL,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_meal_plan_user_id (user_id),
    INDEX idx_meal_plan_approved (is_approved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- user_sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    login_at DATETIME(6) NULL,
    device_info JSON NULL,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    INDEX idx_user_sessions_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- user_settings (unique on user_id + settings_type)
CREATE TABLE IF NOT EXISTS user_settings (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    settings_type VARCHAR(64) NOT NULL DEFAULT 'health_profile',
    settings_data JSON NULL,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE INDEX uq_user_settings_user_type (user_id, settings_type),
    INDEX idx_user_settings_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- user_settings_history
CREATE TABLE IF NOT EXISTS user_settings_history (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    settings_type VARCHAR(64) NULL,
    settings_data JSON NULL,
    previous_settings_data JSON NULL,
    changed_fields JSON NULL,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    created_by CHAR(36) NULL,
    PRIMARY KEY (id),
    INDEX idx_user_settings_history_user_id (user_id),
    INDEX idx_user_settings_history_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- enterprises
CREATE TABLE IF NOT EXISTS enterprises (
    id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(64) NULL,
    address TEXT NULL,
    organization_type VARCHAR(64) NULL,
    created_by CHAR(36) NOT NULL,
    is_active TINYINT(1) NULL DEFAULT 1,
    settings JSON NULL,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE INDEX uq_enterprises_email (email),
    INDEX idx_enterprises_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- organization_users
CREATE TABLE IF NOT EXISTS organization_users (
    id CHAR(36) NOT NULL,
    enterprise_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    role VARCHAR(64) NULL DEFAULT 'patient',
    status VARCHAR(32) NULL DEFAULT 'active',
    notes TEXT NULL,
    metadata JSON NULL,
    joined_at DATETIME(6) NULL,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    INDEX idx_org_users_enterprise (enterprise_id),
    INDEX idx_org_users_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- invitations
CREATE TABLE IF NOT EXISTS invitations (
    id CHAR(36) NOT NULL,
    enterprise_id CHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    invited_by CHAR(36) NULL,
    invitation_token VARCHAR(512) NOT NULL,
    role VARCHAR(64) NULL DEFAULT 'patient',
    message TEXT NULL,
    status VARCHAR(32) NULL DEFAULT 'pending',
    expires_at DATETIME(6) NULL,
    sent_at DATETIME(6) NULL,
    accepted_at DATETIME(6) NULL,
    accepted_by CHAR(36) NULL,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    UNIQUE INDEX uq_invitations_token (invitation_token(255)),
    INDEX idx_invitations_enterprise (enterprise_id),
    INDEX idx_invitations_email_status (email, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- user_trials
CREATE TABLE IF NOT EXISTS user_trials (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    start_date DATETIME(6) NULL,
    end_date DATETIME(6) NULL,
    starts_at DATETIME(6) NULL,
    ends_at DATETIME(6) NULL,
    is_used TINYINT(1) NULL DEFAULT 0,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    INDEX idx_user_trials_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- payment_transactions (minimal structure, extend as needed)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    amount_cents INT NULL,
    currency VARCHAR(8) NULL,
    status VARCHAR(32) NULL,
    external_id VARCHAR(255) NULL,
    metadata JSON NULL,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    INDEX idx_payment_transactions_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- user_subscriptions (minimal structure, extend as needed)
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    plan_id VARCHAR(64) NULL,
    status VARCHAR(32) NULL,
    current_period_start DATETIME(6) NULL,
    current_period_end DATETIME(6) NULL,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    INDEX idx_user_subscriptions_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- feature_usage (minimal structure, extend as needed)
CREATE TABLE IF NOT EXISTS feature_usage (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    feature_name VARCHAR(128) NULL,
    usage_count INT NULL DEFAULT 0,
    period_start DATETIME(6) NULL,
    period_end DATETIME(6) NULL,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    INDEX idx_feature_usage_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- sessions (Supabase public.sessions uses session_id as PK)
CREATE TABLE IF NOT EXISTS sessions (
    session_id CHAR(36) NOT NULL,
    user_id CHAR(36) NULL,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    session_data JSON NULL,
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (session_id),
    INDEX idx_sessions_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- paystack_webhooks
CREATE TABLE IF NOT EXISTS paystack_webhooks (
    id CHAR(36) NOT NULL,
    event_type VARCHAR(128) NULL,
    paystack_event_id VARCHAR(255) NULL,
    paystack_reference VARCHAR(255) NULL,
    event_data JSON NULL,
    processed TINYINT(1) NULL DEFAULT 0,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_paystack_webhooks_processed (processed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- pending_meal_plans
CREATE TABLE IF NOT EXISTS pending_meal_plans (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NULL,
    plan_data JSON NULL,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    INDEX idx_pending_meal_plans_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- shared_recipes
CREATE TABLE IF NOT EXISTS shared_recipes (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NULL,
    recipe_type VARCHAR(128) NULL,
    suggestion TEXT NULL,
    instructions TEXT NULL,
    ingredients TEXT NULL,
    detected_foods TEXT NULL,
    analysis_id VARCHAR(255) NULL,
    youtube TEXT NULL,
    `google` TEXT NULL,
    resources JSON NULL,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_shared_recipes_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- subscription_plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id CHAR(36) NOT NULL,
    name VARCHAR(128) NULL,
    duration_days INT NULL,
    price_usd DECIMAL(10, 2) NULL,
    is_active TINYINT(1) NULL DEFAULT 1,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    INDEX idx_subscription_plans_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- usage_tracking
CREATE TABLE IF NOT EXISTS usage_tracking (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    feature_name VARCHAR(128) NULL,
    usage_count INT NULL DEFAULT 0,
    usage_date DATE NULL,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_usage_tracking_user_date (user_id, usage_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- meal_tracking: tracks if users have cooked/eaten their meals
CREATE TABLE IF NOT EXISTS meal_tracking (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    meal_plan_id CHAR(36) NOT NULL,
    day VARCHAR(20) NOT NULL,
    meal_type VARCHAR(20) NOT NULL,
    cooked_at DATETIME(6) NULL,
    eaten_at DATETIME(6) NULL,
    reminder_sent_at DATETIME(6) NULL,
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE INDEX uq_meal_tracking_user_plan_day_meal (user_id, meal_plan_id, day, meal_type),
    INDEX idx_meal_tracking_user_id (user_id),
    INDEX idx_meal_tracking_meal_plan_id (meal_plan_id),
    INDEX idx_meal_tracking_cooked_at (cooked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- meal_reminder_settings: user preferences for meal reminders
CREATE TABLE IF NOT EXISTS meal_reminder_settings (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    reminders_enabled TINYINT(1) NULL DEFAULT 1,
    breakfast_reminder_time TIME NULL DEFAULT '08:00:00',
    lunch_reminder_time TIME NULL DEFAULT '12:00:00',
    dinner_reminder_time TIME NULL DEFAULT '18:00:00',
    followup_delay_hours INT NULL DEFAULT 2,
    timezone VARCHAR(64) NULL DEFAULT 'UTC',
    created_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE INDEX uq_meal_reminder_settings_user (user_id),
    INDEX idx_meal_reminder_settings_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
