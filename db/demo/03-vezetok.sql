USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

UPDATE Areas a
JOIN (
            SELECT 'DEMO Ügyvezetés' AS terulet, 'demo.kiraly' AS fiok
  UNION ALL SELECT 'DEMO Gyártás',               'demo.antal'
) v ON v.terulet = a.area_name
JOIN Users u ON u.user_username = v.fiok
SET a.area_manager_id = u.user_id;

UPDATE Departments d
JOIN (
            SELECT 'DEMO Összeszerelés' AS reszleg, 'demo.vass' AS fiok
  UNION ALL SELECT 'DEMO Iroda',                    'demo.barna'
  UNION ALL SELECT 'DEMO Fejlesztés',               'demo.lengyel'
) v ON v.reszleg = d.department_name
JOIN Users u ON u.user_username = v.fiok
SET d.department_manager_id = u.user_id;

UPDATE Shifts s
JOIN (
            SELECT 'DEMO A műszak' AS muszak, 'demo.varga' AS fiok
  UNION ALL SELECT 'DEMO B műszak',           'demo.farkas'
  UNION ALL SELECT 'DEMO C műszak',           'demo.olah'
  UNION ALL SELECT 'DEMO Festés nappali',     'demo.takacs'
  UNION ALL SELECT 'DEMO Raktár nappali',     'demo.hegedus'
) v ON v.muszak = s.shift_name
JOIN Users u ON u.user_username = v.fiok
SET s.shift_manager_id = u.user_id;

UPDATE UserGroups g
LEFT JOIN Shifts      s ON s.shift_id      = g.user_group_shift_id
LEFT JOIN Departments d ON d.department_id = g.user_group_department_id
LEFT JOIN Areas       a ON a.area_id       = g.user_group_area_id
SET g.user_group_manager_id = COALESCE(
  s.shift_manager_id, d.department_manager_id, a.area_manager_id
)
WHERE g.user_group_name LIKE 'DEMO %';

UPDATE Employees e
JOIN (
            SELECT 'DEMO-001' AS tol, 'DEMO-004' AS ig, 'DEMO-005' AS vezeto
  UNION ALL SELECT 'DEMO-006', 'DEMO-009', 'DEMO-010'
  UNION ALL SELECT 'DEMO-011', 'DEMO-014', 'DEMO-015'
  UNION ALL SELECT 'DEMO-016', 'DEMO-019', 'DEMO-020'
  UNION ALL SELECT 'DEMO-021', 'DEMO-023', 'DEMO-024'
  UNION ALL SELECT 'DEMO-026', 'DEMO-029', 'DEMO-025'
  UNION ALL SELECT 'DEMO-034', 'DEMO-036', 'DEMO-033'
) v ON e.employee_code BETWEEN v.tol AND v.ig
JOIN Employees m ON m.employee_code = v.vezeto
SET e.employee_manager_id = m.employee_id;

UPDATE Employees e
JOIN Employees m ON m.employee_code = 'DEMO-030'
SET e.employee_manager_id = m.employee_id
WHERE e.employee_code IN ('DEMO-031', 'DEMO-032');

UPDATE Employees e
JOIN Employees m ON m.employee_code = 'DEMO-031'
SET e.employee_manager_id = m.employee_id
WHERE e.employee_code IN ('DEMO-005', 'DEMO-010', 'DEMO-015', 'DEMO-020');

UPDATE Employees e
JOIN Employees m ON m.employee_code = 'DEMO-030'
SET e.employee_manager_id = m.employee_id
WHERE e.employee_code IN ('DEMO-024', 'DEMO-025', 'DEMO-033');


SET SQL_SAFE_UPDATES = @elozo_safe_updates;

SELECT a.area_name AS terulet,
       p.area_name AS szulo_terulet,
       u.user_username AS terulet_vezeto
FROM Areas a
LEFT JOIN Areas p ON p.area_id = a.area_parent_id
LEFT JOIN Users u ON u.user_id = a.area_manager_id
WHERE a.area_name LIKE 'DEMO %'
ORDER BY COALESCE(p.area_name, ''), a.area_name;

SELECT g.user_group_name AS csoport,
       COALESCE(s.shift_name, d.department_name, a.area_name) AS csomopont,
       u.user_username AS vezeto,
       w.work_schedule_name AS munkarend,
       COUNT(e.employee_id) AS letszam
FROM UserGroups g
LEFT JOIN Shifts        s ON s.shift_id            = g.user_group_shift_id
LEFT JOIN Departments   d ON d.department_id       = g.user_group_department_id
LEFT JOIN Areas         a ON a.area_id             = g.user_group_area_id
LEFT JOIN Users         u ON u.user_id             = g.user_group_manager_id
LEFT JOIN WorkSchedules w ON w.work_schedule_id    = g.user_group_work_schedule_id
LEFT JOIN Employees     e ON e.employee_user_group_id = g.user_group_id
WHERE g.user_group_name LIKE 'DEMO %'
GROUP BY g.user_group_name, csomopont, u.user_username, w.work_schedule_name
ORDER BY g.user_group_name;

SELECT e.employee_code AS kod,
       CONCAT(e.employee_last_name, ' ', e.employee_first_name) AS nev,
       CONCAT(m.employee_last_name, ' ', m.employee_first_name) AS felettes
FROM Employees e
LEFT JOIN Employees m ON m.employee_id = e.employee_manager_id
WHERE e.employee_code LIKE 'DEMO-%'
ORDER BY e.employee_code;
