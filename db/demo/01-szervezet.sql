USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;


SET @koltseghely := (SELECT cost_center_id FROM CostCenters WHERE cost_center_code = 'KP');
SET @muszakos    := (SELECT work_schedule_id FROM WorkSchedules WHERE work_schedule_name = 'Műszakos');
SET @nem_muszakos:= (SELECT work_schedule_id FROM WorkSchedules WHERE work_schedule_name = 'Nem műszakos');
SET @kotetlen    := (SELECT work_schedule_id FROM WorkSchedules WHERE work_schedule_name = 'Kötetlen');
SET @nyolc_ora   := (SELECT working_hour_id FROM WorkingHours WHERE working_hour_num = 8);

INSERT INTO WorkLocations (
  work_location_name, work_location_code, work_location_country,
  work_location_postal_code, work_location_city, work_location_address
)
SELECT v.nev, v.kod, 'Magyarország', v.irsz, v.telepules, v.cim
FROM (
            SELECT 'Győri központ' AS nev, 'GY01' AS kod,
                   '9027' AS irsz, 'Győr' AS telepules,
                   'Ipari park utca 12.' AS cim
  UNION ALL SELECT 'Mosonmagyaróvári telephely', 'MO01',
                   '9200', 'Mosonmagyaróvár', 'Gyári út 4.'
) v
WHERE NOT EXISTS (
  SELECT 1 FROM WorkLocations w WHERE w.work_location_name = v.nev
);

SET @telephely := (
  SELECT work_location_id FROM WorkLocations
  WHERE work_location_code = 'GY01'
);

INSERT INTO Areas (area_name)
SELECT v.nev FROM (
            SELECT 'Tulajdonos' AS nev
  UNION ALL SELECT 'Ügyvezetés'
  UNION ALL SELECT 'Gyártás'
  UNION ALL SELECT 'Export'
  UNION ALL SELECT 'Beszerzés'
  UNION ALL SELECT 'IT'
  UNION ALL SELECT 'Technika'
  UNION ALL SELECT 'Könyvelés'
  UNION ALL SELECT 'Raktár'
  UNION ALL SELECT 'Értékesítés'
) v
WHERE NOT EXISTS (SELECT 1 FROM Areas a WHERE a.area_name = v.nev);

UPDATE Areas a
JOIN (
            SELECT 'Ügyvezetés' AS terulet, 'Tulajdonos' AS szulo
  UNION ALL SELECT 'Gyártás', 'Ügyvezetés'
  UNION ALL SELECT 'Export', 'Ügyvezetés'
  UNION ALL SELECT 'Beszerzés', 'Ügyvezetés'
  UNION ALL SELECT 'IT', 'Ügyvezetés'
  UNION ALL SELECT 'Technika', 'Ügyvezetés'
  UNION ALL SELECT 'Könyvelés', 'Ügyvezetés'
  UNION ALL SELECT 'Raktár', 'Export'
  UNION ALL SELECT 'Értékesítés', 'Export'
) v ON v.terulet = a.area_name
JOIN Areas sz ON sz.area_name = v.szulo
SET a.area_parent_id = sz.area_id;

INSERT INTO Departments (department_name, department_area_id)
SELECT v.nev, a.area_id FROM (
            SELECT 'Előkészítés' AS nev, 'Gyártás' AS terulet
  UNION ALL SELECT 'Összeszerelés és csomagolás', 'Gyártás'
  UNION ALL SELECT 'Külföldi', 'Export'
  UNION ALL SELECT 'Belföldi', 'Export'
  UNION ALL SELECT 'Nyersanyag raktár', 'Raktár'
  UNION ALL SELECT 'Készáru raktár', 'Raktár'
  UNION ALL SELECT 'Nyersanyag beszerzés', 'Beszerzés'
  UNION ALL SELECT 'Csomagolóanyag', 'Beszerzés'
  UNION ALL SELECT 'Fejlesztés', 'IT'
  UNION ALL SELECT 'Rendszergazda', 'IT'
  UNION ALL SELECT 'Villamos', 'Technika'
  UNION ALL SELECT 'Gépészeti', 'Technika'
) v
JOIN Areas a ON a.area_name = v.terulet
WHERE NOT EXISTS (SELECT 1 FROM Departments d
                  WHERE d.department_name = v.nev
                    AND d.department_area_id = a.area_id);

INSERT INTO Shifts (shift_name, shift_department_id)
SELECT v.nev, d.department_id FROM (
            SELECT 'Előkészítés A' AS nev, 'Előkészítés' AS reszleg
  UNION ALL SELECT 'Előkészítés B', 'Előkészítés'
  UNION ALL SELECT 'Előkészítés C', 'Előkészítés'
  UNION ALL SELECT 'Összeszerelés A', 'Összeszerelés és csomagolás'
  UNION ALL SELECT 'Összeszerelés B', 'Összeszerelés és csomagolás'
  UNION ALL SELECT 'Összeszerelés C', 'Összeszerelés és csomagolás'
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
       @koltseghely, v.munkarend, @nyolc_ora, c.core_hour_id
FROM (
            SELECT 'Tulajdonos' AS nev, 'Tulajdonos' AS terulet, NULL AS reszleg, NULL AS muszak, @kotetlen AS munkarend, NULL AS torzsido
  UNION ALL SELECT 'Ügyvezetés', 'Ügyvezetés', NULL, NULL, @nem_muszakos, '07:00-15:00'
  UNION ALL SELECT 'Előkészítés A', 'Gyártás', 'Előkészítés', 'Előkészítés A', @muszakos, '06:00-14:00'
  UNION ALL SELECT 'Előkészítés B', 'Gyártás', 'Előkészítés', 'Előkészítés B', @muszakos, '14:00-22:00'
  UNION ALL SELECT 'Előkészítés C', 'Gyártás', 'Előkészítés', 'Előkészítés C', @muszakos, '22:00-06:00'
  UNION ALL SELECT 'Összeszerelés A', 'Gyártás', 'Összeszerelés és csomagolás', 'Összeszerelés A', @muszakos, '06:00-14:00'
  UNION ALL SELECT 'Összeszerelés B', 'Gyártás', 'Összeszerelés és csomagolás', 'Összeszerelés B', @muszakos, '14:00-22:00'
  UNION ALL SELECT 'Összeszerelés C', 'Gyártás', 'Összeszerelés és csomagolás', 'Összeszerelés C', @muszakos, '22:00-06:00'
  UNION ALL SELECT 'Külföldi export', 'Export', 'Külföldi', NULL, @nem_muszakos, '07:00-15:00'
  UNION ALL SELECT 'Belföldi export', 'Export', 'Belföldi', NULL, @nem_muszakos, '07:00-15:00'
  UNION ALL SELECT 'Nyersanyag raktár', 'Raktár', 'Nyersanyag raktár', NULL, @muszakos, '06:00-14:00'
  UNION ALL SELECT 'Készáru raktár', 'Raktár', 'Készáru raktár', NULL, @muszakos, '06:00-14:00'
  UNION ALL SELECT 'Értékesítés', 'Értékesítés', NULL, NULL, @nem_muszakos, '07:00-15:00'
  UNION ALL SELECT 'Nyersanyag beszerzés', 'Beszerzés', 'Nyersanyag beszerzés', NULL, @nem_muszakos, '07:00-15:00'
  UNION ALL SELECT 'Csomagolóanyag', 'Beszerzés', 'Csomagolóanyag', NULL, @nem_muszakos, '07:00-15:00'
  UNION ALL SELECT 'Fejlesztés', 'IT', 'Fejlesztés', NULL, @nem_muszakos, '07:00-15:00'
  UNION ALL SELECT 'Rendszergazda', 'IT', 'Rendszergazda', NULL, @nem_muszakos, '07:00-15:00'
  UNION ALL SELECT 'Villamos', 'Technika', 'Villamos', NULL, @nem_muszakos, '07:00-15:00'
  UNION ALL SELECT 'Gépészeti', 'Technika', 'Gépészeti', NULL, @nem_muszakos, '07:00-15:00'
  UNION ALL SELECT 'Könyvelés', 'Könyvelés', NULL, NULL, @nem_muszakos, '07:00-15:00'
) v
JOIN Areas a ON a.area_name = v.terulet
LEFT JOIN Departments d ON d.department_name = v.reszleg AND d.department_area_id = a.area_id
LEFT JOIN Shifts      s ON s.shift_name      = v.muszak
LEFT JOIN CoreHours   c ON c.core_hour_name  = v.torzsido
WHERE NOT EXISTS (SELECT 1 FROM UserGroups g WHERE g.user_group_name = v.nev);

SET SQL_SAFE_UPDATES = @elozo_safe_updates;

SELECT a.area_name AS terulet, p.area_name AS szulo
FROM Areas a LEFT JOIN Areas p ON p.area_id = a.area_parent_id
ORDER BY COALESCE(p.area_name, ''), a.area_name;

SELECT g.user_group_name AS csoport,
       COALESCE(s.shift_name, d.department_name, a.area_name) AS csomopont,
       w.work_schedule_name AS munkarend, c.core_hour_name AS torzsido
FROM UserGroups g
LEFT JOIN Shifts        s ON s.shift_id         = g.user_group_shift_id
LEFT JOIN Departments   d ON d.department_id    = g.user_group_department_id
LEFT JOIN Areas         a ON a.area_id          = g.user_group_area_id
LEFT JOIN WorkSchedules w ON w.work_schedule_id = g.user_group_work_schedule_id
LEFT JOIN CoreHours     c ON c.core_hour_id     = g.user_group_core_hour_id
ORDER BY g.user_group_name;
