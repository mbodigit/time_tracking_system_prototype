USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'Users'
        AND COLUMN_NAME = 'user_failed_attempts') = 0,
    'ALTER TABLE Users ADD COLUMN user_failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'Users'
        AND COLUMN_NAME = 'user_locked_at') = 0,
    'ALTER TABLE Users ADD COLUMN user_locked_at DATETIME NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT u.user_username AS felhasznalonev,
       u.user_failed_attempts AS sikertelen_probalkozas,
       u.user_locked_at AS zarolva
FROM Users u
ORDER BY u.user_username;
