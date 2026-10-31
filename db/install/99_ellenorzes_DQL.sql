USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SELECT 'UserRoles'              AS tabla, COUNT(*) AS sorok FROM UserRoles
UNION ALL SELECT 'Permissions',            COUNT(*) FROM Permissions
UNION ALL SELECT 'RolePermissions',        COUNT(*) FROM RolePermissions
UNION ALL SELECT 'EmployeeStatus',         COUNT(*) FROM EmployeeStatus
UNION ALL SELECT 'EmployeeCategories',     COUNT(*) FROM EmployeeCategories
UNION ALL SELECT 'CostCenters',            COUNT(*) FROM CostCenters
UNION ALL SELECT 'WorkLocations',          COUNT(*) FROM WorkLocations
UNION ALL SELECT 'WorkSchedules',          COUNT(*) FROM WorkSchedules
UNION ALL SELECT 'WorkingHours',           COUNT(*) FROM WorkingHours
UNION ALL SELECT 'CoreHours',              COUNT(*) FROM CoreHours
UNION ALL SELECT 'CompanySettings',        COUNT(*) FROM CompanySettings
UNION ALL SELECT 'Absences',               COUNT(*) FROM Absences
UNION ALL SELECT 'AbsenceWorkSchedules',   COUNT(*) FROM AbsenceWorkSchedules
UNION ALL SELECT 'Allowances',             COUNT(*) FROM Allowances
UNION ALL SELECT 'WorkScheduleAllowances', COUNT(*) FROM WorkScheduleAllowances
UNION ALL SELECT 'GlobalCalendar',         COUNT(*) FROM GlobalCalendar
UNION ALL SELECT 'Areas',                  COUNT(*) FROM Areas
UNION ALL SELECT 'Departments',            COUNT(*) FROM Departments
UNION ALL SELECT 'Shifts',                 COUNT(*) FROM Shifts
UNION ALL SELECT 'UserGroups',             COUNT(*) FROM UserGroups
UNION ALL SELECT 'Employees',              COUNT(*) FROM Employees
UNION ALL SELECT 'Users',                  COUNT(*) FROM Users
UNION ALL SELECT 'WorkingTimeTracking',    COUNT(*) FROM WorkingTimeTracking
UNION ALL SELECT 'Requests',               COUNT(*) FROM Requests;

SELECT r.user_role_name AS szerepkor, COUNT(rp.permission_id) AS jogosultsagok
FROM UserRoles r
LEFT JOIN RolePermissions rp ON rp.user_role_id = r.user_role_id
GROUP BY r.user_role_id, r.user_role_name
ORDER BY jogosultsagok DESC;

SELECT a.absence_name AS jogcim, a.absence_payroll_code AS berkod,
       GROUP_CONCAT(w.work_schedule_name ORDER BY w.work_schedule_name
                    SEPARATOR ', ') AS munkarendek
FROM Absences a
JOIN AbsenceWorkSchedules aws ON aws.absence_id = a.absence_id
JOIN WorkSchedules w ON w.work_schedule_id = aws.work_schedule_id
GROUP BY a.absence_id, a.absence_name, a.absence_payroll_code, a.absence_sort
ORDER BY a.absence_sort;

SELECT allowance_code AS kod, allowance_name AS jogcim,
       allowance_percent AS szazalek, allowance_payroll_code AS berkod
FROM Allowances ORDER BY allowance_percent, allowance_name;
