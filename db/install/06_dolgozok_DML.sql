USE time_tracking_db_prototype;

SET NAMES utf8mb4;

INSERT INTO Users (
  user_username, user_password_hash, user_employee_id, user_role_id,
  user_status, user_must_change_password
)
SELECT 'admin',
       '$2b$10$.MD27ROWrXbdmYTeQoY/0.MELzygPjzkw0Ieur3EpKQVdmXYVL0V.',
       NULL,
       (SELECT user_role_id FROM UserRoles WHERE user_role_name = 'Admin'),
       1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM Users WHERE user_username = 'admin'
);
