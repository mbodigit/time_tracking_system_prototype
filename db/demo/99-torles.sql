USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

DELETE FROM WorkingTimeTracking;

DELETE FROM Requests;

DELETE FROM Users WHERE user_username <> 'admin';

UPDATE UserGroups  SET user_group_manager_id  = NULL;
UPDATE Areas       SET area_manager_id        = NULL;
UPDATE Areas       SET area_parent_id         = NULL;
UPDATE Departments SET department_manager_id  = NULL;
UPDATE Shifts      SET shift_manager_id       = NULL;

UPDATE Employees SET employee_manager_id = NULL, employee_user_group_id = NULL;

DELETE FROM Employees;

DELETE FROM UserGroups;
DELETE FROM Shifts;
DELETE FROM Departments;
DELETE FROM Areas;
DELETE FROM WorkLocations;

UPDATE CompanySettings SET company_next_employee_code = 1
WHERE company_settings_id = 1;

SET SQL_SAFE_UPDATES = @elozo_safe_updates;

SELECT 'Employees'   AS tabla, COUNT(*) AS megmaradt FROM Employees
UNION ALL SELECT 'Users',       COUNT(*) FROM Users
UNION ALL SELECT 'UserGroups',  COUNT(*) FROM UserGroups
UNION ALL SELECT 'Shifts',      COUNT(*) FROM Shifts
UNION ALL SELECT 'Departments', COUNT(*) FROM Departments
UNION ALL SELECT 'Areas',       COUNT(*) FROM Areas
UNION ALL SELECT 'WorkLocations', COUNT(*) FROM WorkLocations
UNION ALL SELECT 'WorkingTimeTracking', COUNT(*) FROM WorkingTimeTracking
UNION ALL SELECT 'Requests',    COUNT(*) FROM Requests;
