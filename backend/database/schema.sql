-- Supabase/PostgreSQL Schema for MealLens AI
-- This is the actual database schema used by the application
-- Supabase uses PostgreSQL, so this schema uses PostgreSQL types (UUID, JSONB, etc.)

-- Enable UUID generation function (MySQL 8.0+)
-- For older versions, we'll use application-generated UUIDs


CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    display_name VARCHAR(255),
    signup_type VARCHAR(50) DEFAULT 'individual',
    firebase_uid VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_profiles_email (email),
    INDEX idx_profiles_signup_type (signup_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ENTERPRISES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS enterprises (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    organization_type VARCHAR(50) DEFAULT 'clinic',
    created_by CHAR(36) NOT NULL,
    max_users INT DEFAULT 100,
    seat_limit INT DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSON,
    -- Time restrictions
    time_restrictions_enabled BOOLEAN DEFAULT FALSE,
    allowed_time_windows JSON DEFAULT ('[]'),
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_enterprises_created_by (created_by),
    INDEX idx_enterprises_email (email),
    INDEX idx_enterprises_time_restrictions (time_restrictions_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ORGANIZATION_USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS organization_users (
    id CHAR(36) PRIMARY KEY,
    enterprise_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    role_in_organization VARCHAR(50) DEFAULT 'member',
    is_admin BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_org_user (enterprise_id, user_id),
    INDEX idx_org_users_enterprise (enterprise_id),
    INDEX idx_org_users_user (user_id),
    INDEX idx_org_users_status (status),
    INDEX idx_org_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INVITATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invitations (
    id CHAR(36) PRIMARY KEY,
    enterprise_id CHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    invited_by CHAR(36),
    invitation_token VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) DEFAULT 'member',
    message TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    accepted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_invitations_enterprise (enterprise_id),
    INDEX idx_invitations_email (email),
    INDEX idx_invitations_token (invitation_token),
    INDEX idx_invitations_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- USER_SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    settings_type VARCHAR(100) NOT NULL,
    settings_data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_settings (user_id, settings_type),
    INDEX idx_user_settings_user (user_id),
    INDEX idx_user_settings_type (settings_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- USER_SETTINGS_HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings_history (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    settings_type VARCHAR(100) NOT NULL,
    settings_data JSON NOT NULL,
    previous_settings_data JSON,
    changed_fields JSON,  -- Array stored as JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by CHAR(36),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_settings_history_user (user_id),
    INDEX idx_settings_history_created_at (created_at DESC),
    INDEX idx_settings_history_type (settings_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DETECTION_HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS detection_history (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36),
    firebase_uid VARCHAR(255),
    recipe_type VARCHAR(100) NOT NULL,
    suggestion TEXT,
    instructions TEXT,
    ingredients TEXT,
    detected_foods TEXT,
    analysis_id VARCHAR(255),
    youtube TEXT,
    google TEXT,
    resources TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_detection_history_user (user_id),
    INDEX idx_detection_history_created_at (created_at DESC),
    INDEX idx_detection_history_analysis (analysis_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MEAL_PLAN_MANAGEMENT TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS meal_plan_management (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    name VARCHAR(255),
    start_date DATE,
    end_date DATE,
    meal_plan JSON,
    has_sickness BOOLEAN DEFAULT FALSE,
    sickness_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_meal_plans_user (user_id),
    INDEX idx_meal_plans_updated_at (updated_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- FEEDBACK TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS feedback (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36),
    feedback_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_feedback_user (user_id),
    INDEX idx_feedback_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    plan_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'trial',
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_subscriptions_user (user_id),
    INDEX idx_subscriptions_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- USER_TRIALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_trials (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    duration_days INT DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_trials_user (user_id),
    INDEX idx_trials_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PAYMENT_TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payment_transactions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    paystack_reference VARCHAR(255),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_payments_user (user_id),
    INDEX idx_payments_status (status),
    INDEX idx_payments_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- USER_SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36),
    session_id VARCHAR(255) UNIQUE,
    session_data JSON,
    login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_at TIMESTAMP NULL,
    device_info TEXT,
    ip_address VARCHAR(45),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_session_id (session_id),
    INDEX idx_sessions_login_at (login_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- AI_SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_sessions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_ai_sessions_user (user_id),
    INDEX idx_ai_sessions_timestamp (timestamp DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

