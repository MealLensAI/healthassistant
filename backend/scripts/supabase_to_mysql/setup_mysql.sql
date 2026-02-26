-- =============================================================================
-- Run this file ONCE as the MySQL root user to create the database and user.
-- After running, use the user and password below in backend/.env
-- =============================================================================

-- 1. Create the database
CREATE DATABASE IF NOT EXISTS healthassistant
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 2. Create a user and set password (change 'HealthAssistantDev' if you want)
CREATE USER IF NOT EXISTS 'healthassistant'@'localhost'
  IDENTIFIED BY 'HealthAssistantDev';

-- 3. Give that user full access to the healthassistant database
GRANT ALL PRIVILEGES ON healthassistant.* TO 'healthassistant'@'localhost';
FLUSH PRIVILEGES;

-- 4. Confirm: you should see the new database
SHOW DATABASES LIKE 'healthassistant';

-- Done. In backend/.env set:
--   MYSQL_USER=healthassistant
--   MYSQL_PASSWORD=HealthAssistantDev
--   MYSQL_DATABASE=healthassistant
