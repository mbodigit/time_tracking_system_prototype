USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

SET @muszakos     := (SELECT work_schedule_id FROM WorkSchedules WHERE work_schedule_name = 'Műszakos');
SET @nem_muszakos := (SELECT work_schedule_id FROM WorkSchedules WHERE work_schedule_name = 'Nem műszakos');
SET @nyolc_ora    := (SELECT working_hour_id FROM WorkingHours WHERE working_hour_num = 8);

UPDATE Employees e
JOIN (
            SELECT 'TESZT-V1'  AS kod, 'Bognár'  AS vnev, 'Ildikó'    AS knev
  UNION ALL SELECT 'TESZT-D1',  'Barta',    'Máté'
  UNION ALL SELECT 'TESZT-D2',  'Csonka',   'Rita'
  UNION ALL SELECT 'TESZT-D3',  'Domonkos', 'Áron'
  UNION ALL SELECT 'TESZT-D4',  'Kelemen',  'Dávid'
  UNION ALL SELECT 'TESZT-D5',  'Nagy',     'Tímea'
  UNION ALL SELECT 'TESZT-VM1', 'Szalai',   'Gergő'
  UNION ALL SELECT 'TESZT-VN1', 'Hajdu',    'Krisztina'
  UNION ALL SELECT 'TESZT-DM1', 'Pataki',   'Levente'
  UNION ALL SELECT 'TESZT-DN1', 'Márton',   'Zsófia'
  UNION ALL SELECT 'TESZT-HR1', 'Erdei',    'Andrea'
  UNION ALL SELECT 'TESZT-A1',  'Siklósi',  'Tamás'
  UNION ALL SELECT 'TESZT-K1',  'Virág',    'Bence'
) v ON v.kod = e.employee_code
SET e.employee_last_name  = v.vnev,
    e.employee_first_name = v.knev;

UPDATE Employees
SET employee_work_schedule_id = @muszakos
WHERE employee_code IN ('TESZT-D1', 'TESZT-D2', 'TESZT-D3')
  AND employee_work_schedule_id IS NULL;

UPDATE Employees
SET employee_work_schedule_id = @nem_muszakos
WHERE employee_code IN ('TESZT-V1', 'TESZT-D4', 'TESZT-D5', 'KP-001')
  AND employee_work_schedule_id IS NULL;

UPDATE Employees
SET employee_working_hour_id = @nyolc_ora
WHERE (employee_code LIKE 'TESZT-%' OR employee_code = 'KP-001')
  AND employee_working_hour_id IS NULL;

UPDATE Employees
SET employee_annual_leave_days = 25
WHERE (employee_code LIKE 'TESZT-%' OR employee_code = 'KP-001')
  AND (employee_annual_leave_days IS NULL OR employee_annual_leave_days = 0);

UPDATE Employees e
JOIN Employees m ON m.employee_code = 'TESZT-VN1'
SET e.employee_manager_id = m.employee_id
WHERE e.employee_code IN ('TESZT-HR1', 'TESZT-A1', 'KP-001')
  AND e.employee_manager_id IS NULL
  AND e.employee_user_group_id IS NULL;

DELETE FROM Employees
WHERE employee_code REGEXP '^[0-9]{5}$'
  AND employee_id NOT IN (SELECT DISTINCT wtt_employee_id FROM WorkingTimeTracking)
  AND employee_id NOT IN (SELECT DISTINCT request_employee_id FROM Requests)
  AND employee_id NOT IN (
    SELECT DISTINCT user_employee_id FROM Users WHERE user_employee_id IS NOT NULL
  )
  AND employee_id NOT IN (
    SELECT felettes_id FROM (
      SELECT DISTINCT employee_manager_id AS felettes_id FROM Employees
      WHERE employee_manager_id IS NOT NULL
    ) felettesek
  );

SET SQL_SAFE_UPDATES = @elozo_safe_updates;

SELECT e.employee_code AS kod,
       CONCAT(e.employee_last_name, ' ', e.employee_first_name) AS nev,
       w.work_schedule_name AS munkarend,
       h.working_hour_num   AS napi_ora,
       e.employee_annual_leave_days AS szabadsag,
       g.user_group_name    AS csoport,
       CONCAT(m.employee_last_name, ' ', m.employee_first_name) AS felettes
FROM Employees e
LEFT JOIN WorkSchedules w ON w.work_schedule_id = e.employee_work_schedule_id
LEFT JOIN WorkingHours  h ON h.working_hour_id  = e.employee_working_hour_id
LEFT JOIN UserGroups    g ON g.user_group_id    = e.employee_user_group_id
LEFT JOIN Employees     m ON m.employee_id      = e.employee_manager_id
WHERE e.employee_code NOT LIKE 'DEMO-%'
ORDER BY e.employee_code;

SELECT 'Hiányos dolgozó' AS ellenorzes, e.employee_code AS kod
FROM Employees e
WHERE e.employee_code NOT IN ('TESZT-D5', 'TESZT-VM1', 'TESZT-VN1')
  AND (e.employee_work_schedule_id IS NULL
       OR e.employee_working_hour_id IS NULL
       OR e.employee_annual_leave_days IS NULL
       OR (e.employee_user_group_id IS NULL AND e.employee_manager_id IS NULL))
ORDER BY e.employee_code;
