-- Adatbázis szintű tesztesetek
--
-- Előfeltétel, ebben a sorrendben:
--   1. db/install   séma és alkalmazás-törzsadat
--   2. db/demo      a bemutató vállalat adatai
--
-- Ez a szkript NEM hoz létre alapadatot, csak ellenőriz. A hatókör-teszt
-- alanya a 00004 kódú Előkészítés A műszakvezető (demo.elokeszites.a).
-- A vizsgált napok decemberre esnek, ahol a demo nem rögzít munkaidőt.

USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

SELECT IF(
  (SELECT COUNT(*) FROM Employees WHERE employee_code REGEXP '^[0-9]{5}$') >= 80
  AND (SELECT COUNT(*) FROM Users WHERE user_username = 'demo.elokeszites.a') = 1,
  'Az előfeltételek megvannak.',
  'HIBA: elobb futtasd a db/install es a db/demo fajljait.'
) AS elofeltetel;

DELETE FROM WorkingTimeTracking
WHERE wtt_working_date IN ('2026-12-14', '2026-12-15');

SET SQL_SAFE_UPDATES = @elozo_safe_updates;


-- ============================================================
-- 1. TESZT  Jövőbeli napra elrendelés, időpontok nélkül
--    Elvárt: sikeres beszúrás, a start és az end NULL marad.
-- ============================================================

INSERT INTO WorkingTimeTracking (wtt_employee_id, wtt_working_date,
                                 wtt_is_ordered, wtt_ordered_by)
VALUES (
  (SELECT employee_id FROM Employees WHERE employee_code = '00020'),
  '2026-12-14', 1,
  (SELECT user_id FROM Users WHERE user_username = 'demo.elokeszites.a')
);

SELECT '1. teszt' AS teszt, wtt_working_date, wtt_working_start, wtt_working_end,
       wtt_is_ordered, wtt_ordered_by
FROM WorkingTimeTracking
WHERE wtt_working_date = '2026-12-14';


-- ============================================================
-- 2. TESZT  Ugyanarra a dolgozóra ugyanarra a napra második sor
--    Elvárt: HIBA, uq_wtt_employee_date megsértése (1062).
--    Futtasd külön, mert a hiba megállítja a szkriptet.
-- ============================================================

-- INSERT INTO WorkingTimeTracking (wtt_employee_id, wtt_working_date)
-- VALUES ((SELECT employee_id FROM Employees WHERE employee_code = '00020'), '2026-12-14');


-- ============================================================
-- 3. TESZT  Munkaidő felvitele a már elrendelt sorra
--    Elvárt: a jelölő és az elrendelő megmarad.
-- ============================================================

UPDATE WorkingTimeTracking
SET wtt_working_start = '2026-12-14 06:00:00',
    wtt_working_end   = '2026-12-14 14:00:00'
WHERE wtt_employee_id = (SELECT employee_id FROM Employees WHERE employee_code = '00020')
  AND wtt_working_date = '2026-12-14';

SELECT '3. teszt' AS teszt, wtt_working_start, wtt_working_end,
       wtt_is_ordered, wtt_ordered_by
FROM WorkingTimeTracking
WHERE wtt_working_date = '2026-12-14';


-- ============================================================
-- 4. TESZT  Éjfélen átnyúló műszak
--    A munkanap a kezdés napja, a záró időpont a következő naptári napon van.
--    Elvárt: sikeres beszúrás, a chk_wtt_working_order nem sérül.
-- ============================================================

INSERT INTO WorkingTimeTracking (wtt_employee_id, wtt_working_date,
                                 wtt_working_start, wtt_working_end)
VALUES (
  (SELECT employee_id FROM Employees WHERE employee_code = '00028'),
  '2026-12-15', '2026-12-15 22:00:00', '2026-12-16 06:00:00'
);

SELECT '4. teszt' AS teszt, wtt_working_date, wtt_working_start, wtt_working_end,
       TIMESTAMPDIFF(MINUTE, wtt_working_start, wtt_working_end) AS perc
FROM WorkingTimeTracking
WHERE wtt_working_date = '2026-12-15';


-- ============================================================
-- 5. TESZT  Az elrendelő felhasználó törlése
--    Elvárt: a munkaidő-sor megmarad, az ordered_by NULL lesz,
--            a jelölő viszont marad 1 (ON DELETE SET NULL).
--    FIGYELEM: ez törli a műszakvezető fiókját.
--    Futtasd külön, és utána építsd újra a demót.
-- ============================================================

-- DELETE FROM Users WHERE user_username = 'demo.elokeszites.a';
--
-- SELECT '5. teszt' AS teszt, wtt_working_date, wtt_is_ordered, wtt_ordered_by
-- FROM WorkingTimeTracking
-- WHERE wtt_working_date = '2026-12-14';


-- ============================================================
-- 6. TESZT  A vezetői hatókör lekérdezése
--    A lekérdezés a megvalósított hatókör-logikát követi: csoportvezető,
--    rekurzív területi öröklés, részlegvezető, műszakvezető, közvetlen felettes.
--    Elvárt: az Előkészítés A csoport öt tagja, köztük maga a műszakvezető.
--    Más csoport dolgozója NEM jelenhet meg.
-- ============================================================

SET @vezeto_user := (SELECT user_id FROM Users WHERE user_username = 'demo.elokeszites.a');
SET @vezeto_emp  := (SELECT user_employee_id FROM Users WHERE user_username = 'demo.elokeszites.a');

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
       CASE WHEN e.employee_id = @vezeto_emp THEN 'onmaga'
            WHEN e.employee_manager_id = @vezeto_emp THEN 'felettes'
            ELSE 'csoport' END AS kapcsolat
FROM Employees e
LEFT JOIN UserGroups  g ON g.user_group_id    = e.employee_user_group_id
LEFT JOIN Departments d ON d.department_id    = g.user_group_department_id
LEFT JOIN Shifts      s ON s.shift_id         = g.user_group_shift_id
WHERE g.user_group_manager_id = @vezeto_user
   OR g.user_group_area_id IN (SELECT area_id FROM managed_areas)
   OR d.department_manager_id = @vezeto_user
   OR s.shift_manager_id      = @vezeto_user
   OR e.employee_manager_id    = @vezeto_emp
ORDER BY e.employee_code;


-- ============================================================
-- 6/b KONTROLL  Ki látja a 00066 kódú beszerzési dolgozót
--    Elvárt: a műszakvezető NEM, a beszerzési vezető IGEN,
--            és rajta kívül csak a fában fölötte lévő vezetők.
-- ============================================================

SELECT '6/b kontroll' AS teszt, u.user_username AS lathato_neki
FROM Users u
JOIN UserRoles r ON r.user_role_id = u.user_role_id
JOIN Employees e ON e.employee_code = '00066'
LEFT JOIN UserGroups  g ON g.user_group_id    = e.employee_user_group_id
LEFT JOIN Departments d ON d.department_id    = g.user_group_department_id
LEFT JOIN Shifts      s ON s.shift_id         = g.user_group_shift_id
WHERE r.user_role_name = 'Vezető'
  AND (
        g.user_group_manager_id = u.user_id
     OR d.department_manager_id = u.user_id
     OR s.shift_manager_id      = u.user_id
     OR e.employee_manager_id   = u.user_employee_id
     OR g.user_group_area_id IN (
          WITH RECURSIVE lanc AS (
            SELECT area_id FROM Areas WHERE area_manager_id = u.user_id
            UNION ALL
            SELECT a.area_id FROM Areas a
            JOIN lanc l ON l.area_id = a.area_parent_id
          )
          SELECT area_id FROM lanc
        )
  )
ORDER BY u.user_username;
