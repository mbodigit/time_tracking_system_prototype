-- Adatbázis szintű tesztesetek
--
-- Előfeltétel, ebben a sorrendben:
--   1. db/install   séma és alkalmazás-törzsadat
--   2. db/demo      a bemutató vállalat adatai
--   3. db/fixtures  a TESZT dolgozók és fiókok
--
-- Ez a szkript NEM hoz létre adatot, csak ellenőriz. A hatókör-teszt
-- alanya Varga István (demo.varga), aki a DEMO A műszak vezetője,
-- és ezen keresztül a DEMO Összeszerelés A csoport vezetője is.

USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

SELECT IF(
  (SELECT COUNT(*) FROM Employees WHERE employee_code LIKE 'TESZT-D%') >= 5
  AND (SELECT COUNT(*) FROM Users WHERE user_username = 'demo.varga') = 1,
  'Az előfeltételek megvannak.',
  'HIBA: elobb futtasd a db/install, db/demo es db/fixtures fajljait.'
) AS elofeltetel;

DELETE FROM WorkingTimeTracking
WHERE wtt_working_date IN ('2026-10-10', '2026-10-12')
  AND wtt_employee_id IN (
    SELECT employee_id FROM Employees WHERE employee_code LIKE 'TESZT-%'
  );

SET SQL_SAFE_UPDATES = @elozo_safe_updates;


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
--    Futtasd külön, és utána a fixture-t újra kell futtatni.
-- ============================================================

-- DELETE FROM Users WHERE user_username = 'teszt.vezeto';
--
-- SELECT '5. teszt' AS teszt, wtt_working_date, wtt_is_ordered, wtt_ordered_by
-- FROM WorkingTimeTracking
-- WHERE wtt_working_date = '2026-10-10';


-- ============================================================
-- 6. TESZT  A vezetői hatókör lekérdezése
--    A lekérdezés a megvalósított hatókör-logikát követi: csoportvezető,
--    rekurzív területi öröklés, részlegvezető, műszakvezető, közvetlen felettes.
--    Elvárt a TESZT dolgozókra szűkítve: D1, D2, D3 a csoporton át,
--    D4 a felettesi kapcsolaton át, összesen négy sor.
--    D5 NEM jelenhet meg.
-- ============================================================

SET @vezeto_user := (SELECT user_id FROM Users WHERE user_username = 'demo.varga');
SET @vezeto_emp  := (SELECT user_employee_id FROM Users WHERE user_username = 'demo.varga');

WITH RECURSIVE managed_areas AS (
  SELECT area_id FROM Areas WHERE area_manager_id = @vezeto_user
  UNION ALL
  SELECT a.area_id FROM Areas a
  JOIN managed_areas m ON m.area_id = a.area_parent_id
)
SELECT '6. teszt' AS teszt,
       e.employee_code,
       CONCAT(e.employee_last_name, ' ', e.employee_first_name) AS nev,
       g.user_group_name AS csoport,
       CASE WHEN e.employee_manager_id = @vezeto_emp THEN 'felettes'
            ELSE 'csoport' END AS kapcsolat
FROM Employees e
LEFT JOIN UserGroups  g ON g.user_group_id    = e.employee_user_group_id
LEFT JOIN Departments d ON d.department_id    = g.user_group_department_id
LEFT JOIN Shifts      s ON s.shift_id         = g.user_group_shift_id
WHERE e.employee_code LIKE 'TESZT-%'
  AND (
        g.user_group_manager_id = @vezeto_user
     OR g.user_group_area_id IN (SELECT area_id FROM managed_areas)
     OR d.department_manager_id = @vezeto_user
     OR s.shift_manager_id      = @vezeto_user
     OR e.employee_manager_id    = @vezeto_emp
  )
ORDER BY e.employee_code;


-- ============================================================
-- 6/b KONTROLL  A TESZT-D5 egyetlen vezető hatókörében sem szerepel
--    Elvárt: nulla sor.
-- ============================================================

SELECT '6/b kontroll' AS teszt, u.user_username AS lathato_neki
FROM Users u
JOIN UserRoles r ON r.user_role_id = u.user_role_id
JOIN Employees e ON e.employee_code = 'TESZT-D5'
LEFT JOIN UserGroups  g ON g.user_group_id    = e.employee_user_group_id
LEFT JOIN Departments d ON d.department_id    = g.user_group_department_id
LEFT JOIN Shifts      s ON s.shift_id         = g.user_group_shift_id
WHERE r.user_role_name = 'Vezető'
  AND (
        g.user_group_manager_id = u.user_id
     OR d.department_manager_id = u.user_id
     OR s.shift_manager_id      = u.user_id
     OR e.employee_manager_id   = u.user_employee_id
  );
