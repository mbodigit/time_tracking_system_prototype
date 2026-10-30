USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @hash := 'IDE_JON_A_GENERALT_HASH';

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

INSERT INTO Employees (
  employee_code, employee_first_name, employee_last_name,
  employee_work_schedule_id, employee_working_hour_id, employee_core_hour_id,
  employee_break_minutes, employee_break_paid,
  employee_break_start, employee_break_end,
  employee_cost_center_id, employee_category_id, employee_status_id
)
SELECT v.kod, v.knev, v.vnev,
       (SELECT work_schedule_id FROM WorkSchedules WHERE work_schedule_name = v.munkarend),
       (SELECT working_hour_id  FROM WorkingHours  WHERE working_hour_num = 8),
       (SELECT core_hour_id     FROM CoreHours     WHERE core_hour_name = v.torzsido),
       30, 0, v.szunet_kezd, v.szunet_veg,
       (SELECT cost_center_id FROM CostCenters WHERE cost_center_code = 'KP'),
       (SELECT employee_category_id FROM EmployeeCategories
         WHERE employee_category_name = 'Szellemi'),
       (SELECT employee_status_id FROM EmployeeStatus
         WHERE employee_status_name = 'Aktív')
FROM (
            SELECT 'TESZT-VM1' AS kod, 'Gergő' AS knev, 'Szalai' AS vnev,
                   'Műszakos' AS munkarend, '22:00-06:00' AS torzsido,
                   '02:00:00' AS szunet_kezd, '02:30:00' AS szunet_veg
  UNION ALL SELECT 'TESZT-VN1', 'Krisztina', 'Hajdu',   'Nem műszakos',
                   '07:00-15:00', '12:00:00', '12:30:00'
  UNION ALL SELECT 'TESZT-DM1', 'Levente',   'Pataki',  'Műszakos',
                   '22:00-06:00', '02:00:00', '02:30:00'
  UNION ALL SELECT 'TESZT-DN1', 'Zsófia',    'Márton',  'Nem műszakos',
                   '07:00-15:00', '12:00:00', '12:30:00'
  UNION ALL SELECT 'TESZT-HR1', 'Andrea',    'Erdei',   'Nem műszakos',
                   '07:00-15:00', '12:00:00', '12:30:00'
  UNION ALL SELECT 'TESZT-A1',  'Tamás',     'Siklósi', 'Nem műszakos',
                   '07:00-15:00', '12:00:00', '12:30:00'
) v
WHERE NOT EXISTS (SELECT 1 FROM Employees e WHERE e.employee_code = v.kod);

INSERT INTO Employees (
  employee_code, employee_first_name, employee_last_name,
  employee_work_schedule_id, employee_break_paid,
  employee_cost_center_id, employee_category_id, employee_status_id
)
SELECT 'TESZT-K1', 'Bence', 'Virág',
       (SELECT work_schedule_id FROM WorkSchedules WHERE work_schedule_name = 'Kötetlen'),
       0,
       (SELECT cost_center_id FROM CostCenters WHERE cost_center_code = 'KP'),
       (SELECT employee_category_id FROM EmployeeCategories
         WHERE employee_category_name = 'Szellemi'),
       (SELECT employee_status_id FROM EmployeeStatus
         WHERE employee_status_name = 'Aktív')
WHERE NOT EXISTS (SELECT 1 FROM Employees WHERE employee_code = 'TESZT-K1');

SET @vezeto_m_id  := (SELECT employee_id FROM Employees WHERE employee_code = 'TESZT-VM1');
SET @vezeto_nm_id := (SELECT employee_id FROM Employees WHERE employee_code = 'TESZT-VN1');

UPDATE Employees SET employee_manager_id = @vezeto_m_id
WHERE employee_code IN ('TESZT-DM1', 'TESZT-K1');

UPDATE Employees SET employee_manager_id = @vezeto_nm_id
WHERE employee_code IN ('TESZT-DN1', 'TESZT-HR1', 'TESZT-A1');

UPDATE Employees
SET employee_core_hour_id =
      (SELECT core_hour_id FROM CoreHours WHERE core_hour_name = '22:00-06:00'),
    employee_break_start = '02:00:00',
    employee_break_end = '02:30:00',
    employee_break_minutes = 30,
    employee_break_paid = 0
WHERE employee_code IN ('TESZT-VM1', 'TESZT-DM1');

UPDATE Employees
SET employee_core_hour_id =
      (SELECT core_hour_id FROM CoreHours WHERE core_hour_name = '07:00-15:00'),
    employee_break_start = '12:00:00',
    employee_break_end = '12:30:00',
    employee_break_minutes = 30,
    employee_break_paid = 0
WHERE employee_code IN ('TESZT-VN1', 'TESZT-DN1', 'TESZT-HR1', 'TESZT-A1');

UPDATE Employees
SET employee_working_hour_id =
      (SELECT working_hour_id FROM WorkingHours WHERE working_hour_num = 8)
WHERE employee_code IN
      ('TESZT-VM1', 'TESZT-VN1', 'TESZT-DM1', 'TESZT-DN1', 'TESZT-HR1', 'TESZT-A1', 'TESZT-K1')
  AND employee_working_hour_id IS NULL;

UPDATE Employees
SET employee_annual_leave_days = 25
WHERE employee_code LIKE 'TESZT-%'
  AND employee_annual_leave_days IS NULL;

INSERT INTO Users (
  user_username, user_password_hash, user_employee_id, user_role_id,
  user_status, user_must_change_password
)
SELECT v.nev, @hash,
       (SELECT employee_id  FROM Employees WHERE employee_code = v.kod),
       (SELECT user_role_id FROM UserRoles WHERE user_role_name = v.szerepkor),
       v.allapot, 0
FROM (
            SELECT 'teszt.vezeto.m'   AS nev, 'TESZT-VM1' AS kod, 'Vezető'  AS szerepkor, 1 AS allapot
  UNION ALL SELECT 'teszt.vezeto.nm',  'TESZT-VN1', 'Vezető',  1
  UNION ALL SELECT 'teszt.dolgozo.m',  'TESZT-DM1', 'Dolgozó', 1
  UNION ALL SELECT 'teszt.dolgozo.nm', 'TESZT-DN1', 'Dolgozó', 1
  UNION ALL SELECT 'teszt.hr',         'TESZT-HR1', 'HR-Bér',  1
  UNION ALL SELECT 'teszt.admin',      'TESZT-A1',  'Admin',   1
  UNION ALL SELECT 'teszt.inaktiv',    'TESZT-D5',  'Dolgozó', 0
) v
WHERE NOT EXISTS (SELECT 1 FROM Users u WHERE u.user_username = v.nev);

SET SQL_SAFE_UPDATES = @elozo_safe_updates;

SELECT e.employee_code,
       w.work_schedule_name AS munkarend,
       c.core_hour_name     AS torzsido,
       e.employee_break_start AS szunet_kezdete,
       e.employee_break_end   AS szunet_vege,
       e.employee_break_minutes AS szunet_perc,
       e.employee_break_paid    AS fizetett_szunet,
       h.working_hour_num       AS napi_oraszam,
       e.employee_annual_leave_days AS szabadsagkeret,
       f.employee_code      AS felettes
FROM Employees e
LEFT JOIN WorkSchedules w ON w.work_schedule_id = e.employee_work_schedule_id
LEFT JOIN CoreHours     c ON c.core_hour_id     = e.employee_core_hour_id
LEFT JOIN WorkingHours  h ON h.working_hour_id  = e.employee_working_hour_id
LEFT JOIN Employees     f ON f.employee_id      = e.employee_manager_id
WHERE e.employee_code LIKE 'TESZT-%'
ORDER BY e.employee_id;

SELECT u.user_username, r.user_role_name, u.user_status
FROM Users u
JOIN UserRoles r ON r.user_role_id = u.user_role_id
WHERE u.user_username LIKE 'teszt.%'
ORDER BY u.user_username;