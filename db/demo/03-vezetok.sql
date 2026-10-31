USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;


UPDATE Areas t
JOIN (
            SELECT 'Tulajdonos' AS egyseg, 'demo.tulajdonos' AS fiok
  UNION ALL SELECT 'Ügyvezetés', 'demo.ugyvezeto'
  UNION ALL SELECT 'Gyártás', 'demo.gyartas'
  UNION ALL SELECT 'Export', 'demo.export'
  UNION ALL SELECT 'Értékesítés', 'demo.ertekesites'
  UNION ALL SELECT 'Beszerzés', 'demo.beszerzes'
  UNION ALL SELECT 'IT', 'demo.it'
  UNION ALL SELECT 'Könyvelés', 'demo.konyveles'
) v ON v.egyseg = t.area_name
JOIN Users u ON u.user_username = v.fiok
SET t.area_manager_id = u.user_id;

UPDATE Departments t
JOIN (
            SELECT 'Nyersanyag raktár' AS egyseg, 'demo.raktar.nyersanyag' AS fiok
  UNION ALL SELECT 'Készáru raktár', 'demo.raktar.keszaru'
  UNION ALL SELECT 'Villamos', 'demo.villamos'
  UNION ALL SELECT 'Gépészeti', 'demo.gepeszet'
) v ON v.egyseg = t.department_name
JOIN Users u ON u.user_username = v.fiok
SET t.department_manager_id = u.user_id;

UPDATE Shifts t
JOIN (
            SELECT 'Előkészítés A' AS egyseg, 'demo.elokeszites.a' AS fiok
  UNION ALL SELECT 'Előkészítés B', 'demo.elokeszites.b'
  UNION ALL SELECT 'Előkészítés C', 'demo.elokeszites.c'
  UNION ALL SELECT 'Összeszerelés A', 'demo.osszeszereles.a'
  UNION ALL SELECT 'Összeszerelés B', 'demo.osszeszereles.b'
  UNION ALL SELECT 'Összeszerelés C', 'demo.osszeszereles.c'
) v ON v.egyseg = t.shift_name
JOIN Users u ON u.user_username = v.fiok
SET t.shift_manager_id = u.user_id;

DROP TEMPORARY TABLE IF EXISTS terulet_vezeto;

CREATE TEMPORARY TABLE terulet_vezeto (
  area_id    INT NOT NULL PRIMARY KEY,
  manager_id INT NULL
) ENGINE=InnoDB;

INSERT INTO terulet_vezeto (area_id, manager_id)
WITH RECURSIVE lanc AS (
  SELECT area_id AS kezdo, area_id, area_parent_id, area_manager_id, 0 AS szint
  FROM Areas
  UNION ALL
  SELECT l.kezdo, a.area_id, a.area_parent_id, a.area_manager_id, l.szint + 1
  FROM lanc l
  JOIN Areas a ON a.area_id = l.area_parent_id
),
legkozelebbi AS (
  SELECT kezdo, area_manager_id,
         ROW_NUMBER() OVER (PARTITION BY kezdo ORDER BY szint) AS sorszam
  FROM lanc
  WHERE area_manager_id IS NOT NULL
)
SELECT kezdo, area_manager_id FROM legkozelebbi WHERE sorszam = 1;

UPDATE UserGroups g
LEFT JOIN Shifts         s ON s.shift_id      = g.user_group_shift_id
LEFT JOIN Departments    d ON d.department_id = g.user_group_department_id
LEFT JOIN terulet_vezeto t ON t.area_id       = g.user_group_area_id
SET g.user_group_manager_id = COALESCE(
  s.shift_manager_id, d.department_manager_id, t.manager_id
);

DROP TEMPORARY TABLE terulet_vezeto;

UPDATE Employees e
JOIN UserGroups g ON g.user_group_id = e.employee_user_group_id
JOIN Users      u ON u.user_id       = g.user_group_manager_id
SET e.employee_manager_id = u.user_employee_id
WHERE e.employee_id <> u.user_employee_id;

UPDATE Employees e
JOIN Users u ON u.user_employee_id = e.employee_id
JOIN (
            SELECT 'demo.ugyvezeto' AS fiok, 'demo.tulajdonos' AS felettes_fiok
  UNION ALL SELECT 'demo.gyartas', 'demo.ugyvezeto'
  UNION ALL SELECT 'demo.export', 'demo.ugyvezeto'
  UNION ALL SELECT 'demo.beszerzes', 'demo.ugyvezeto'
  UNION ALL SELECT 'demo.it', 'demo.ugyvezeto'
  UNION ALL SELECT 'demo.konyveles', 'demo.ugyvezeto'
  UNION ALL SELECT 'demo.elokeszites.a', 'demo.gyartas'
  UNION ALL SELECT 'demo.elokeszites.b', 'demo.gyartas'
  UNION ALL SELECT 'demo.elokeszites.c', 'demo.gyartas'
  UNION ALL SELECT 'demo.osszeszereles.a', 'demo.gyartas'
  UNION ALL SELECT 'demo.osszeszereles.b', 'demo.gyartas'
  UNION ALL SELECT 'demo.osszeszereles.c', 'demo.gyartas'
  UNION ALL SELECT 'demo.raktar.nyersanyag', 'demo.export'
  UNION ALL SELECT 'demo.raktar.keszaru', 'demo.export'
  UNION ALL SELECT 'demo.ertekesites', 'demo.export'
  UNION ALL SELECT 'demo.villamos', 'demo.ugyvezeto'
  UNION ALL SELECT 'demo.gepeszet', 'demo.ugyvezeto'
) v ON v.fiok = u.user_username
JOIN Users fu ON fu.user_username = v.felettes_fiok
SET e.employee_manager_id = fu.user_employee_id;

UPDATE Employees e
JOIN Users u ON u.user_employee_id = e.employee_id
SET e.employee_manager_id = NULL
WHERE u.user_username = 'demo.tulajdonos';

SET SQL_SAFE_UPDATES = @elozo_safe_updates;

SELECT 'Vezeto nelkuli csoport' AS ellenorzes, user_group_name AS csoport
FROM UserGroups WHERE user_group_manager_id IS NULL;

SELECT 'Csoport nelkul es felettes nelkul' AS ellenorzes, employee_code AS kod
FROM Employees
WHERE employee_user_group_id IS NULL AND employee_manager_id IS NULL;

SELECT g.user_group_name AS csoport, u.user_username AS vezeto,
       COUNT(e.employee_id) AS letszam
FROM UserGroups g
LEFT JOIN Users     u ON u.user_id                = g.user_group_manager_id
LEFT JOIN Employees e ON e.employee_user_group_id = g.user_group_id
GROUP BY g.user_group_name, u.user_username
ORDER BY g.user_group_name;

SELECT e.employee_code AS kod,
       CONCAT(e.employee_last_name, ' ', e.employee_first_name) AS nev,
       u.user_username AS fiok,
       CONCAT(m.employee_last_name, ' ', m.employee_first_name) AS felettes
FROM Employees e
JOIN Users u ON u.user_employee_id = e.employee_id
LEFT JOIN Employees m ON m.employee_id = e.employee_manager_id
ORDER BY e.employee_code;
