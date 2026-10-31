USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

SET @koltseghely := (SELECT cost_center_id FROM CostCenters WHERE cost_center_code = 'KP');
SET @muszakos    := (SELECT work_schedule_id FROM WorkSchedules WHERE work_schedule_name = 'Műszakos');
SET @nem_muszakos:= (SELECT work_schedule_id FROM WorkSchedules WHERE work_schedule_name = 'Nem műszakos');
SET @kotetlen    := (SELECT work_schedule_id FROM WorkSchedules WHERE work_schedule_name = 'Kötetlen');
SET @nyolc_ora   := (SELECT working_hour_id FROM WorkingHours WHERE working_hour_num = 8);
SET @reggel  := (SELECT core_hour_id FROM CoreHours WHERE core_hour_name = '06:00-14:00');
SET @delutan := (SELECT core_hour_id FROM CoreHours WHERE core_hour_name = '14:00-22:00');
SET @ejszaka := (SELECT core_hour_id FROM CoreHours WHERE core_hour_name = '22:00-06:00');
SET @iroda   := (SELECT core_hour_id FROM CoreHours WHERE core_hour_name = '07:00-15:00');

INSERT INTO Areas (area_name)
SELECT v.nev FROM (
            SELECT 'DEMO Ügyvezetés' AS nev
  UNION ALL SELECT 'DEMO Gyártás'
  UNION ALL SELECT 'DEMO Kiszolgálás'
) v
WHERE NOT EXISTS (SELECT 1 FROM Areas a WHERE a.area_name = v.nev);

UPDATE Areas
SET area_parent_id = (SELECT area_id FROM (
  SELECT area_id FROM Areas WHERE area_name = 'DEMO Ügyvezetés'
) AS gyoker)
WHERE area_name IN ('DEMO Gyártás', 'DEMO Kiszolgálás');

INSERT INTO Departments (department_name, department_area_id)
SELECT v.nev, a.area_id FROM (
            SELECT 'DEMO Összeszerelés' AS nev, 'DEMO Gyártás'     AS terulet
  UNION ALL SELECT 'DEMO Festés',               'DEMO Gyártás'
  UNION ALL SELECT 'DEMO Logisztika',           'DEMO Kiszolgálás'
  UNION ALL SELECT 'DEMO Iroda',                'DEMO Kiszolgálás'
  UNION ALL SELECT 'DEMO Fejlesztés',           'DEMO Kiszolgálás'
) v
JOIN Areas a ON a.area_name = v.terulet
WHERE NOT EXISTS (
  SELECT 1 FROM Departments d WHERE d.department_name = v.nev
);

INSERT INTO Shifts (shift_name, shift_department_id)
SELECT v.nev, d.department_id FROM (
            SELECT 'DEMO A műszak' AS nev, 'DEMO Összeszerelés' AS reszleg
  UNION ALL SELECT 'DEMO B műszak',        'DEMO Összeszerelés'
  UNION ALL SELECT 'DEMO C műszak',        'DEMO Összeszerelés'
  UNION ALL SELECT 'DEMO Festés nappali',  'DEMO Festés'
  UNION ALL SELECT 'DEMO Raktár nappali',  'DEMO Logisztika'
) v
JOIN Departments d ON d.department_name = v.reszleg
WHERE NOT EXISTS (SELECT 1 FROM Shifts s WHERE s.shift_name = v.nev);

INSERT INTO UserGroups (
  user_group_name, user_group_status, user_group_area_id,
  user_group_department_id, user_group_shift_id,
  user_group_cost_center_id, user_group_work_schedule_id,
  user_group_working_hour_id, user_group_core_hour_id
)
SELECT v.nev, 'Aktív', a.area_id, d.department_id, s.shift_id,
       @koltseghely, v.munkarend, @nyolc_ora, v.torzsido
FROM (
            SELECT 'DEMO Összeszerelés A' AS nev, 'DEMO Gyártás' AS terulet,
                   'DEMO Összeszerelés' AS reszleg, 'DEMO A műszak' AS muszak,
                   @muszakos AS munkarend, @reggel AS torzsido
  UNION ALL SELECT 'DEMO Összeszerelés B', 'DEMO Gyártás', 'DEMO Összeszerelés',
                   'DEMO B műszak', @muszakos, @delutan
  UNION ALL SELECT 'DEMO Összeszerelés C', 'DEMO Gyártás', 'DEMO Összeszerelés',
                   'DEMO C műszak', @muszakos, @ejszaka
  UNION ALL SELECT 'DEMO Festés', 'DEMO Gyártás', 'DEMO Festés',
                   'DEMO Festés nappali', @muszakos, @reggel
  UNION ALL SELECT 'DEMO Logisztika', 'DEMO Kiszolgálás', 'DEMO Logisztika',
                   'DEMO Raktár nappali', @muszakos, @reggel
  UNION ALL SELECT 'DEMO Iroda', 'DEMO Kiszolgálás', 'DEMO Iroda',
                   NULL, @nem_muszakos, @iroda
  UNION ALL SELECT 'DEMO Fejlesztés', 'DEMO Kiszolgálás', 'DEMO Fejlesztés',
                   NULL, @kotetlen, NULL
  UNION ALL SELECT 'DEMO Vezetőség', 'DEMO Ügyvezetés', NULL,
                   NULL, @nem_muszakos, @iroda
) v
JOIN Areas a ON a.area_name = v.terulet
LEFT JOIN Departments d ON d.department_name = v.reszleg
LEFT JOIN Shifts      s ON s.shift_name      = v.muszak
WHERE NOT EXISTS (
  SELECT 1 FROM UserGroups g WHERE g.user_group_name = v.nev
);

SET SQL_SAFE_UPDATES = @elozo_safe_updates;

SELECT a.area_name AS terulet, p.area_name AS szulo_terulet
FROM Areas a
LEFT JOIN Areas p ON p.area_id = a.area_parent_id
WHERE a.area_name LIKE 'DEMO %'
ORDER BY COALESCE(p.area_name, ''), a.area_name;

SELECT g.user_group_name AS csoport,
       COALESCE(s.shift_name, d.department_name, a.area_name) AS csomopont,
       w.work_schedule_name AS munkarend
FROM UserGroups g
LEFT JOIN Shifts        s ON s.shift_id         = g.user_group_shift_id
LEFT JOIN Departments   d ON d.department_id    = g.user_group_department_id
LEFT JOIN Areas         a ON a.area_id          = g.user_group_area_id
LEFT JOIN WorkSchedules w ON w.work_schedule_id = g.user_group_work_schedule_id
WHERE g.user_group_name LIKE 'DEMO %'
ORDER BY g.user_group_name;
