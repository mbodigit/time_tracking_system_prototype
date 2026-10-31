USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

SET @hash := (SELECT user_password_hash FROM Users WHERE user_username = 'teszt.hr');
SET @koltseghely := (SELECT cost_center_id FROM CostCenters WHERE cost_center_code = 'KP');
SET @allapot_aktiv := (SELECT employee_status_id FROM EmployeeStatus WHERE employee_status_name = 'Aktív');
SET @szellemi := (SELECT employee_category_id FROM EmployeeCategories WHERE employee_category_name = 'Szellemi');
SET @fizikai  := (SELECT employee_category_id FROM EmployeeCategories WHERE employee_category_name = 'Fizikai');
SET @muszakos    := (SELECT work_schedule_id FROM WorkSchedules WHERE work_schedule_name = 'Műszakos');
SET @nem_muszakos:= (SELECT work_schedule_id FROM WorkSchedules WHERE work_schedule_name = 'Nem műszakos');
SET @kotetlen    := (SELECT work_schedule_id FROM WorkSchedules WHERE work_schedule_name = 'Kötetlen');
SET @nyolc_ora := (SELECT working_hour_id FROM WorkingHours WHERE working_hour_num = 8);
SET @reggel := (SELECT core_hour_id FROM CoreHours WHERE core_hour_name = '06:00-14:00');
SET @delutan:= (SELECT core_hour_id FROM CoreHours WHERE core_hour_name = '14:00-22:00');
SET @ejszaka:= (SELECT core_hour_id FROM CoreHours WHERE core_hour_name = '22:00-06:00');
SET @iroda  := (SELECT core_hour_id FROM CoreHours WHERE core_hour_name = '07:00-15:00');

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

INSERT INTO Employees (
  employee_code, employee_last_name, employee_first_name,
  employee_gender, employee_birth_date, employee_work_email,
  employee_work_schedule_id, employee_working_hour_id, employee_core_hour_id,
  employee_break_minutes, employee_break_paid,
  employee_break_start, employee_break_end,
  employee_annual_leave_days,
  employee_cost_center_id, employee_category_id, employee_status_id,
  employee_user_group_id
)
SELECT v.kod, v.vnev, v.knev, v.nem, v.szuletes, v.email,
       v.munkarend, @nyolc_ora, v.torzsido,
       30, 0, v.szunet_kezd, v.szunet_veg,
       25, @koltseghely, v.kategoria, @allapot_aktiv, g.user_group_id
FROM (
            SELECT 'DEMO-001' AS kod, 'Kovács'  AS vnev, 'Bence'   AS knev, 'Férfi' AS nem, '2003-04-12' AS szuletes, NULL AS email, @muszakos AS munkarend, @reggel AS torzsido, '10:00:00' AS szunet_kezd, '10:30:00' AS szunet_veg, @fizikai AS kategoria, 'DEMO Összeszerelés A' AS csoport
  UNION ALL SELECT 'DEMO-002','Szabó','Réka','Nő','1999-08-03',NULL,@muszakos,@reggel,'10:00:00','10:30:00',@fizikai,'DEMO Összeszerelés A'
  UNION ALL SELECT 'DEMO-003','Tóth','Gábor','Férfi','1991-02-19',NULL,@muszakos,@reggel,'10:00:00','10:30:00',@fizikai,'DEMO Összeszerelés A'
  UNION ALL SELECT 'DEMO-004','Nagy','Katalin','Nő','1983-11-27',NULL,@muszakos,@reggel,'10:00:00','10:30:00',@fizikai,'DEMO Összeszerelés A'
  UNION ALL SELECT 'DEMO-005','Varga','István','Férfi','1968-06-08','demo.varga@pelda.hu',@muszakos,@reggel,'10:00:00','10:30:00',@fizikai,'DEMO Összeszerelés A'
  UNION ALL SELECT 'DEMO-006','Kiss','Dániel','Férfi','2002-01-25',NULL,@muszakos,@delutan,'18:00:00','18:30:00',@fizikai,'DEMO Összeszerelés B'
  UNION ALL SELECT 'DEMO-007','Molnár','Eszter','Nő','1996-09-14',NULL,@muszakos,@delutan,'18:00:00','18:30:00',@fizikai,'DEMO Összeszerelés B'
  UNION ALL SELECT 'DEMO-008','Horváth','Zoltán','Férfi','1988-03-30',NULL,@muszakos,@delutan,'18:00:00','18:30:00',@fizikai,'DEMO Összeszerelés B'
  UNION ALL SELECT 'DEMO-009','Balogh','Mária','Nő','1979-12-05',NULL,@muszakos,@delutan,'18:00:00','18:30:00',@fizikai,'DEMO Összeszerelés B'
  UNION ALL SELECT 'DEMO-010','Farkas','Péter','Férfi','1964-07-21','demo.farkas@pelda.hu',@muszakos,@delutan,'18:00:00','18:30:00',@fizikai,'DEMO Összeszerelés B'
  UNION ALL SELECT 'DEMO-011','Papp','Tamás','Férfi','2001-05-09',NULL,@muszakos,@ejszaka,'02:00:00','02:30:00',@fizikai,'DEMO Összeszerelés C'
  UNION ALL SELECT 'DEMO-012','Lakatos','Nóra','Nő','1994-10-17',NULL,@muszakos,@ejszaka,'02:00:00','02:30:00',@fizikai,'DEMO Összeszerelés C'
  UNION ALL SELECT 'DEMO-013','Juhász','Ákos','Férfi','1986-01-11',NULL,@muszakos,@ejszaka,'02:00:00','02:30:00',@fizikai,'DEMO Összeszerelés C'
  UNION ALL SELECT 'DEMO-014','Mészáros','Ildikó','Nő','1977-04-02',NULL,@muszakos,@ejszaka,'02:00:00','02:30:00',@fizikai,'DEMO Összeszerelés C'
  UNION ALL SELECT 'DEMO-015','Oláh','Sándor','Férfi','1966-09-23','demo.olah@pelda.hu',@muszakos,@ejszaka,'02:00:00','02:30:00',@fizikai,'DEMO Összeszerelés C'
  UNION ALL SELECT 'DEMO-016','Simon','Viktor','Férfi','2000-02-28',NULL,@muszakos,@reggel,'10:00:00','10:30:00',@fizikai,'DEMO Festés'
  UNION ALL SELECT 'DEMO-017','Rácz','Anna','Nő','1993-06-15',NULL,@muszakos,@reggel,'10:00:00','10:30:00',@fizikai,'DEMO Festés'
  UNION ALL SELECT 'DEMO-018','Fekete','László','Férfi','1985-08-07',NULL,@muszakos,@reggel,'10:00:00','10:30:00',@fizikai,'DEMO Festés'
  UNION ALL SELECT 'DEMO-019','Szűcs','Judit','Nő','1975-03-19',NULL,@muszakos,@reggel,'10:00:00','10:30:00',@fizikai,'DEMO Festés'
  UNION ALL SELECT 'DEMO-020','Takács','Attila','Férfi','1969-11-30','demo.takacs@pelda.hu',@muszakos,@reggel,'10:00:00','10:30:00',@fizikai,'DEMO Festés'
  UNION ALL SELECT 'DEMO-021','Fodor','Krisztián','Férfi','1997-07-04',NULL,@muszakos,@reggel,'10:00:00','10:30:00',@fizikai,'DEMO Logisztika'
  UNION ALL SELECT 'DEMO-022','Veres','Beáta','Nő','1990-12-22',NULL,@muszakos,@reggel,'10:00:00','10:30:00',@fizikai,'DEMO Logisztika'
  UNION ALL SELECT 'DEMO-023','Orsós','Milán','Férfi','1982-05-13',NULL,@muszakos,@reggel,'10:00:00','10:30:00',@fizikai,'DEMO Logisztika'
  UNION ALL SELECT 'DEMO-024','Hegedűs','Zsuzsanna','Nő','1971-10-26','demo.hegedus@pelda.hu',@muszakos,@reggel,'10:00:00','10:30:00',@fizikai,'DEMO Logisztika'
  UNION ALL SELECT 'DEMO-025','Barna','Gergő','Férfi','1998-03-08','demo.barna@pelda.hu',@nem_muszakos,@iroda,'12:00:00','12:30:00',@szellemi,'DEMO Iroda'
  UNION ALL SELECT 'DEMO-026','Deák','Lilla','Nő','1992-09-01','demo.deak@pelda.hu',@nem_muszakos,@iroda,'12:00:00','12:30:00',@szellemi,'DEMO Iroda'
  UNION ALL SELECT 'DEMO-027','Pintér','Ádám','Férfi','1987-04-16','demo.pinter@pelda.hu',@nem_muszakos,@iroda,'12:00:00','12:30:00',@szellemi,'DEMO Iroda'
  UNION ALL SELECT 'DEMO-028','Bogdán','Emese','Nő','1978-01-07','demo.bogdan@pelda.hu',@nem_muszakos,@iroda,'12:00:00','12:30:00',@szellemi,'DEMO Iroda'
  UNION ALL SELECT 'DEMO-029','Somogyi','Ferenc','Férfi','1967-05-29','demo.somogyi@pelda.hu',@nem_muszakos,@iroda,'12:00:00','12:30:00',@szellemi,'DEMO Iroda'
  UNION ALL SELECT 'DEMO-030','Király','Róbert','Férfi','1974-02-11','demo.kiraly@pelda.hu',@nem_muszakos,@iroda,'12:00:00','12:30:00',@szellemi,'DEMO Vezetőség'
  UNION ALL SELECT 'DEMO-031','Antal','Gabriella','Nő','1981-08-24','demo.antal@pelda.hu',@nem_muszakos,@iroda,'12:00:00','12:30:00',@szellemi,'DEMO Vezetőség'
  UNION ALL SELECT 'DEMO-032','Vass','Norbert','Férfi','1989-06-18','demo.vass@pelda.hu',@nem_muszakos,@iroda,'12:00:00','12:30:00',@szellemi,'DEMO Vezetőség'
  UNION ALL SELECT 'DEMO-033','Lengyel','Dóra','Nő','1995-11-02','demo.lengyel@pelda.hu',@kotetlen,NULL,NULL,NULL,@szellemi,'DEMO Fejlesztés'
  UNION ALL SELECT 'DEMO-034','Gulyás','Márk','Férfi','1990-03-21','demo.gulyas@pelda.hu',@kotetlen,NULL,NULL,NULL,@szellemi,'DEMO Fejlesztés'
  UNION ALL SELECT 'DEMO-035','Balla','Petra','Nő','1984-07-09','demo.balla@pelda.hu',@kotetlen,NULL,NULL,NULL,@szellemi,'DEMO Fejlesztés'
  UNION ALL SELECT 'DEMO-036','Bakos','Tibor','Férfi','1972-12-13','demo.bakos@pelda.hu',@kotetlen,NULL,NULL,NULL,@szellemi,'DEMO Fejlesztés'
) v
JOIN UserGroups g ON g.user_group_name = v.csoport
WHERE NOT EXISTS (
  SELECT 1 FROM Employees e WHERE e.employee_code = v.kod
);

INSERT INTO Users (
  user_username, user_password_hash, user_employee_id,
  user_role_id, user_status, user_must_change_password
)
SELECT v.nev, @hash, e.employee_id, r.user_role_id, 1, 0
FROM (
            SELECT 'demo.varga'    AS nev, 'DEMO-005' AS kod, 'Vezető' AS szerepkor
  UNION ALL SELECT 'demo.farkas',  'DEMO-010', 'Vezető'
  UNION ALL SELECT 'demo.olah',    'DEMO-015', 'Vezető'
  UNION ALL SELECT 'demo.takacs',  'DEMO-020', 'Vezető'
  UNION ALL SELECT 'demo.hegedus', 'DEMO-024', 'Vezető'
  UNION ALL SELECT 'demo.barna',   'DEMO-025', 'Vezető'
  UNION ALL SELECT 'demo.deak',    'DEMO-026', 'Dolgozó'
  UNION ALL SELECT 'demo.pinter',  'DEMO-027', 'Dolgozó'
  UNION ALL SELECT 'demo.bogdan',  'DEMO-028', 'HR-Bér'
  UNION ALL SELECT 'demo.somogyi', 'DEMO-029', 'Dolgozó'
  UNION ALL SELECT 'demo.kiraly',  'DEMO-030', 'Vezető'
  UNION ALL SELECT 'demo.antal',   'DEMO-031', 'Vezető'
  UNION ALL SELECT 'demo.vass',    'DEMO-032', 'Vezető'
  UNION ALL SELECT 'demo.lengyel', 'DEMO-033', 'Vezető'
  UNION ALL SELECT 'demo.gulyas',  'DEMO-034', 'Dolgozó'
  UNION ALL SELECT 'demo.balla',   'DEMO-035', 'Dolgozó'
  UNION ALL SELECT 'demo.bakos',   'DEMO-036', 'Dolgozó'
) v
JOIN Employees e ON e.employee_code   = v.kod
JOIN UserRoles r ON r.user_role_name  = v.szerepkor
WHERE NOT EXISTS (SELECT 1 FROM Users u WHERE u.user_username = v.nev);

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
