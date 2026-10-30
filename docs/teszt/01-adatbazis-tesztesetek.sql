-- Adatbázis szintű tesztesetek
-- Futtatás MySQL Workbenchben, a 001-006 migrációk után.
-- A szkript tesztadatot hoz létre, majd hat esetet ellenőriz.
-- A végén a TAKARITAS szakasz mindent eltávolít.

-- ============================================================
-- TESZTADAT
-- ============================================================

INSERT INTO Areas (area_name)
SELECT 'TESZT Gyártás'
WHERE NOT EXISTS (SELECT 1 FROM Areas WHERE area_name = 'TESZT Gyártás');

INSERT INTO Departments (department_name, department_area_id)
SELECT 'TESZT Összeszerelés', (SELECT area_id FROM Areas WHERE area_name = 'TESZT Gyártás')
WHERE NOT EXISTS (SELECT 1 FROM Departments WHERE department_name = 'TESZT Összeszerelés');

INSERT INTO UserGroups (user_group_name, user_group_area_id, user_group_cost_center_id,
                        user_group_work_schedule_id)
SELECT v.nev,
       (SELECT area_id FROM Areas WHERE area_name = 'TESZT Gyártás'),
       (SELECT cost_center_id FROM CostCenters WHERE cost_center_code = 'KP'),
       (SELECT work_schedule_id FROM WorkSchedules WHERE work_schedule_name = 'Műszakos')
FROM (SELECT 'TESZT A műszak' AS nev UNION ALL SELECT 'TESZT B műszak') v
WHERE NOT EXISTS (SELECT 1 FROM UserGroups g WHERE g.user_group_name = v.nev);

-- A vezető dolgozói rekordja és fiókja
INSERT INTO Employees (employee_code, employee_first_name, employee_last_name,
                       employee_cost_center_id, employee_category_id, employee_status_id,
                       employee_work_schedule_id, employee_working_hour_id,
                       employee_annual_leave_days)
SELECT 'TESZT-V1', 'Ildikó', 'Bognár',
       (SELECT cost_center_id FROM CostCenters WHERE cost_center_code = 'KP'),
       (SELECT employee_category_id FROM EmployeeCategories WHERE employee_category_name = 'Szellemi'),
       (SELECT employee_status_id FROM EmployeeStatus WHERE employee_status_name = 'Aktív'),
       (SELECT work_schedule_id FROM WorkSchedules WHERE work_schedule_name = 'Nem műszakos'),
       (SELECT working_hour_id FROM WorkingHours WHERE working_hour_num = 8),
       25
WHERE NOT EXISTS (SELECT 1 FROM Employees WHERE employee_code = 'TESZT-V1');

INSERT INTO Users (user_username, user_password_hash, user_employee_id, user_role_id,
                   user_status, user_must_change_password)
SELECT 'teszt.vezeto', '$2b$10$aj/VW7Rk8673XqH2aWFth.4DqhjXqtoiZOyMENQ7ey9LVj2Va9YWu',
       (SELECT employee_id FROM Employees WHERE employee_code = 'TESZT-V1'),
       (SELECT user_role_id FROM UserRoles WHERE user_role_name = 'Vezető'), 1, 0
WHERE NOT EXISTS (SELECT 1 FROM Users WHERE user_username = 'teszt.vezeto');

-- A két csoport vezetője ugyanaz a felhasználó
UPDATE UserGroups
SET user_group_manager_id = (SELECT user_id FROM Users WHERE user_username = 'teszt.vezeto')
WHERE user_group_name IN ('TESZT A műszak', 'TESZT B műszak');

-- Négy dolgozó:
--   D1, D2  az A műszakban
--   D3      a B műszakban
--   D4      csoport nélkül, de a vezető a közvetlen felettese
--   D5      kontroll: se csoport, se felettes, nem szabad megjelennie
INSERT INTO Employees (employee_code, employee_first_name, employee_last_name,
                       employee_cost_center_id, employee_category_id, employee_status_id,
                       employee_user_group_id, employee_manager_id,
                       employee_work_schedule_id, employee_working_hour_id,
                       employee_annual_leave_days)
SELECT v.kod, v.knev, v.vnev,
       (SELECT cost_center_id FROM CostCenters WHERE cost_center_code = 'KP'),
       (SELECT employee_category_id FROM EmployeeCategories WHERE employee_category_name = 'Szellemi'),
       (SELECT employee_status_id FROM EmployeeStatus WHERE employee_status_name = 'Aktív'),
       v.csoport, v.felettes,
       (SELECT work_schedule_id FROM WorkSchedules WHERE work_schedule_name = v.munkarend),
       (SELECT working_hour_id FROM WorkingHours WHERE working_hour_num = 8),
       25
FROM (
            SELECT 'TESZT-D1' AS kod, 'Máté' AS knev, 'Barta' AS vnev,
                   (SELECT user_group_id FROM UserGroups WHERE user_group_name = 'TESZT A műszak') AS csoport,
                   NULL AS felettes, 'Műszakos' AS munkarend
  UNION ALL SELECT 'TESZT-D2', 'Rita', 'Csonka',
                   (SELECT user_group_id FROM UserGroups WHERE user_group_name = 'TESZT A műszak'),
                   NULL, 'Műszakos'
  UNION ALL SELECT 'TESZT-D3', 'Áron', 'Domonkos',
                   (SELECT user_group_id FROM UserGroups WHERE user_group_name = 'TESZT B műszak'),
                   NULL, 'Műszakos'
  UNION ALL SELECT 'TESZT-D4', 'Dávid', 'Kelemen', NULL,
                   (SELECT employee_id FROM Employees WHERE employee_code = 'TESZT-V1'),
                   'Nem műszakos'
  UNION ALL SELECT 'TESZT-D5', 'Tímea', 'Nagy', NULL, NULL, 'Nem műszakos'
) v
WHERE NOT EXISTS (SELECT 1 FROM Employees e WHERE e.employee_code = v.kod);


-- ============================================================
-- 1. TESZT  Jövőbeli napra elrendelés, időpontok nélkül
--    Elvárt: sikeres beszúrás, a start és az end NULL marad.
-- ============================================================

INSERT INTO WorkingTimeTracking (wtt_employee_id, wtt_working_date,
                                 wtt_is_ordered, wtt_ordered_by)
VALUES (
  (SELECT employee_id FROM Employees WHERE employee_code = 'TESZT-D1'),
  '2026-10-10', 1,
  (SELECT user_id FROM Users WHERE user_username = 'teszt.vezeto')
);

SELECT '1. teszt' AS teszt, wtt_working_date, wtt_working_start, wtt_working_end,
       wtt_is_ordered, wtt_ordered_by
FROM WorkingTimeTracking
WHERE wtt_working_date = '2026-10-10';


-- ============================================================
-- 2. TESZT  Ugyanarra a dolgozóra ugyanarra a napra második sor
--    Elvárt: HIBA, uq_wtt_employee_date megsértése (1062).
--    Futtasd külön, mert a hiba megállítja a szkriptet.
-- ============================================================

-- INSERT INTO WorkingTimeTracking (wtt_employee_id, wtt_working_date)
-- VALUES ((SELECT employee_id FROM Employees WHERE employee_code = 'TESZT-D1'), '2026-10-10');


-- ============================================================
-- 3. TESZT  Munkaidő felvitele a már elrendelt sorra
--    Elvárt: a jelölő és az elrendelő megmarad.
-- ============================================================

UPDATE WorkingTimeTracking
SET wtt_working_start = '2026-10-10 06:00:00',
    wtt_working_end   = '2026-10-10 14:00:00'
WHERE wtt_employee_id = (SELECT employee_id FROM Employees WHERE employee_code = 'TESZT-D1')
  AND wtt_working_date = '2026-10-10';

SELECT '3. teszt' AS teszt, wtt_working_start, wtt_working_end,
       wtt_is_ordered, wtt_ordered_by
FROM WorkingTimeTracking
WHERE wtt_working_date = '2026-10-10';


-- ============================================================
-- 4. TESZT  Éjfélen átnyúló műszak
--    A munkanap a kezdés napja, a záró időpont a következő naptári napon van.
--    Elvárt: sikeres beszúrás, a chk_wtt_working_order nem sérül.
-- ============================================================

INSERT INTO WorkingTimeTracking (wtt_employee_id, wtt_working_date,
                                 wtt_working_start, wtt_working_end)
VALUES (
  (SELECT employee_id FROM Employees WHERE employee_code = 'TESZT-D2'),
  '2026-10-12', '2026-10-12 22:00:00', '2026-10-13 06:00:00'
);

SELECT '4. teszt' AS teszt, wtt_working_date, wtt_working_start, wtt_working_end,
       TIMESTAMPDIFF(MINUTE, wtt_working_start, wtt_working_end) AS perc
FROM WorkingTimeTracking
WHERE wtt_working_date = '2026-10-12';


-- ============================================================
-- 5. TESZT  Az elrendelő felhasználó törlése
--    Elvárt: a munkaidő-sor megmarad, az ordered_by NULL lesz,
--            a jelölő viszont marad 1 (ON DELETE SET NULL).
--    FIGYELEM: ez törli a teszt vezető fiókját.
--    Futtasd külön, és utána a 6. teszt már nem fut le.
-- ============================================================

-- DELETE FROM Users WHERE user_username = 'teszt.vezeto';
--
-- SELECT '5. teszt' AS teszt, wtt_working_date, wtt_is_ordered, wtt_ordered_by
-- FROM WorkingTimeTracking
-- WHERE wtt_working_date = '2026-10-10';


-- ============================================================
-- 6. TESZT  A vezetői hatókör lekérdezése
--    Elvárt: D1, D2, D3 a csoportokon át, D4 a felettesi kapcsolaton át.
--            D5 NEM jelenhet meg. Összesen négy sor.
-- ============================================================

SELECT '6. teszt' AS teszt,
       e.employee_code,
       CONCAT(e.employee_last_name, ' ', e.employee_first_name) AS nev,
       g.user_group_name AS csoport,
       CASE WHEN g.user_group_manager_id = u.user_id THEN 'csoport'
            ELSE 'felettes' END AS kapcsolat
FROM Employees e
JOIN Users u ON u.user_username = 'teszt.vezeto'
LEFT JOIN UserGroups g ON g.user_group_id = e.employee_user_group_id
WHERE g.user_group_manager_id = u.user_id
   OR e.employee_manager_id   = u.user_employee_id
ORDER BY e.employee_code;


-- ============================================================
-- TAKARITAS
-- ============================================================

-- DELETE FROM WorkingTimeTracking
-- WHERE wtt_employee_id IN (SELECT employee_id FROM Employees WHERE employee_code LIKE 'TESZT-%');
--
-- DELETE FROM Users WHERE user_username = 'teszt.vezeto';
--
-- UPDATE UserGroups SET user_group_manager_id = NULL
-- WHERE user_group_name IN ('TESZT A műszak', 'TESZT B műszak');
--
-- UPDATE Employees SET employee_user_group_id = NULL, employee_manager_id = NULL
-- WHERE employee_code LIKE 'TESZT-%';
--
-- DELETE FROM UserGroups WHERE user_group_name IN ('TESZT A műszak', 'TESZT B műszak');
-- DELETE FROM Employees WHERE employee_code LIKE 'TESZT-%';
-- DELETE FROM Departments WHERE department_name = 'TESZT Összeszerelés';
-- DELETE FROM Areas WHERE area_name = 'TESZT Gyártás';
