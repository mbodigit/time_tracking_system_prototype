USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

DELETE FROM WorkingTimeTracking
WHERE wtt_employee_id IN (
  SELECT employee_id FROM Employees WHERE employee_code LIKE 'DEMO-%'
);

DELETE FROM Requests
WHERE request_employee_id IN (
  SELECT employee_id FROM Employees WHERE employee_code LIKE 'DEMO-%'
);

DELETE FROM Users
WHERE user_employee_id IN (
  SELECT employee_id FROM Employees WHERE employee_code LIKE 'DEMO-%'
);

UPDATE UserGroups
SET user_group_manager_id = NULL
WHERE user_group_name LIKE 'DEMO %';

UPDATE Areas       SET area_manager_id       = NULL WHERE area_name       LIKE 'DEMO %';
UPDATE Departments SET department_manager_id = NULL WHERE department_name LIKE 'DEMO %';
UPDATE Shifts      SET shift_manager_id      = NULL WHERE shift_name      LIKE 'DEMO %';

UPDATE Employees
SET employee_manager_id = NULL
WHERE employee_code LIKE 'DEMO-%';

UPDATE Employees
SET employee_user_group_id = NULL
WHERE employee_user_group_id IN (
  SELECT user_group_id FROM UserGroups WHERE user_group_name LIKE 'DEMO %'
);

DELETE FROM Employees WHERE employee_code LIKE 'DEMO-%';

DELETE FROM UserGroups  WHERE user_group_name  LIKE 'DEMO %';
DELETE FROM Shifts      WHERE shift_name       LIKE 'DEMO %';
DELETE FROM Departments WHERE department_name  LIKE 'DEMO %';
DELETE FROM Areas       WHERE area_name        LIKE 'DEMO %';

SET SQL_SAFE_UPDATES = @elozo_safe_updates;

SELECT 'Employees'   AS tabla, COUNT(*) AS megmaradt FROM Employees   WHERE employee_code   LIKE 'DEMO-%'
UNION ALL SELECT 'UserGroups',  COUNT(*) FROM UserGroups  WHERE user_group_name  LIKE 'DEMO %'
UNION ALL SELECT 'Shifts',      COUNT(*) FROM Shifts      WHERE shift_name       LIKE 'DEMO %'
UNION ALL SELECT 'Departments', COUNT(*) FROM Departments WHERE department_name  LIKE 'DEMO %'
UNION ALL SELECT 'Areas',       COUNT(*) FROM Areas       WHERE area_name        LIKE 'DEMO %';
