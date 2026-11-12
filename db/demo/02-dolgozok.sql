USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;


SET @koltseghely := (SELECT cost_center_id FROM CostCenters WHERE cost_center_code = 'KP');
SET @telephely := (SELECT work_location_id FROM WorkLocations WHERE work_location_code = 'GY01');
SET @allapot_aktiv := (SELECT employee_status_id FROM EmployeeStatus WHERE employee_status_name = 'Aktív');
SET @nyolc_ora := (SELECT working_hour_id FROM WorkingHours WHERE working_hour_num = 8);
SET @hash := '$2b$10$g75zPce2dGS2neU1Ldqp4eSLfKMTHy/in8cHJRV6j4uEm8coaIDpe';

INSERT INTO Employees (
  employee_code, employee_last_name, employee_first_name,
  employee_gender, employee_birth_date, employee_work_email,
  employee_work_schedule_id, employee_working_hour_id, employee_core_hour_id,
  employee_break_minutes, employee_break_paid,
  employee_break_start, employee_break_end,
  employee_annual_leave_days,
  employee_cost_center_id, employee_work_location_id,
  employee_category_id, employee_status_id,
  employee_user_group_id
)
SELECT v.kod, v.vnev, v.knev, v.nem, v.szuletes, v.email,
       w.work_schedule_id, @nyolc_ora, c.core_hour_id,
       v.szunet_perc, 0, v.szunet_kezd, v.szunet_veg,
       25, @koltseghely, @telephely,
       cat.employee_category_id, @allapot_aktiv, g.user_group_id
FROM (
            SELECT '00001' AS kod, 'Kovács' AS vnev, 'Bence' AS knev, 'Férfi' AS nem, '1962-02-02' AS szuletes, 'demo.tulajdonos@pelda.hu' AS email, 'Kötetlen' AS munkarend, NULL AS torzsido, NULL AS szunet_kezd, NULL AS szunet_veg, NULL AS szunet_perc, 'Szellemi' AS kategoria, 'Tulajdonos' AS csoport
  UNION ALL SELECT '00002', 'Szabó', 'Katalin', 'Nő', '1963-03-03', 'demo.ugyvezeto@pelda.hu', 'Kötetlen', NULL, NULL, NULL, NULL, 'Szellemi', 'Ügyvezetés'
  UNION ALL SELECT '00003', 'Tóth', 'István', 'Férfi', '1964-04-04', 'demo.gyartas@pelda.hu', 'Kötetlen', NULL, NULL, NULL, NULL, 'Szellemi', 'Ügyvezetés'
  UNION ALL SELECT '00004', 'Nagy', 'Mária', 'Nő', '1965-05-05', 'demo.elokeszites.a@pelda.hu', 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Szellemi', 'Előkészítés A'
  UNION ALL SELECT '00005', 'Varga', 'Zoltán', 'Férfi', '1966-06-06', 'demo.elokeszites.b@pelda.hu', 'Műszakos', '14:00-22:00', '18:00:00', '18:30:00', 30, 'Szellemi', 'Előkészítés B'
  UNION ALL SELECT '00006', 'Kiss', 'Ildikó', 'Nő', '1967-07-07', 'demo.elokeszites.c@pelda.hu', 'Műszakos', '22:00-06:00', '02:00:00', '02:30:00', 30, 'Szellemi', 'Előkészítés C'
  UNION ALL SELECT '00007', 'Molnár', 'Tamás', 'Férfi', '1968-08-08', 'demo.osszeszereles.a@pelda.hu', 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Szellemi', 'Összeszerelés A'
  UNION ALL SELECT '00008', 'Horváth', 'Judit', 'Nő', '1969-09-09', 'demo.osszeszereles.b@pelda.hu', 'Műszakos', '14:00-22:00', '18:00:00', '18:30:00', 30, 'Szellemi', 'Összeszerelés B'
  UNION ALL SELECT '00009', 'Balogh', 'Sándor', 'Férfi', '1970-10-10', 'demo.osszeszereles.c@pelda.hu', 'Műszakos', '22:00-06:00', '02:00:00', '02:30:00', 30, 'Szellemi', 'Összeszerelés C'
  UNION ALL SELECT '00010', 'Farkas', 'Zsuzsanna', 'Nő', '1971-11-11', 'demo.export@pelda.hu', 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Ügyvezetés'
  UNION ALL SELECT '00011', 'Papp', 'László', 'Férfi', '1972-12-12', 'demo.raktar.nyersanyag@pelda.hu', 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Szellemi', 'Nyersanyag raktár'
  UNION ALL SELECT '00012', 'Lakatos', 'Emese', 'Nő', '1973-01-13', 'demo.raktar.keszaru@pelda.hu', 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Szellemi', 'Készáru raktár'
  UNION ALL SELECT '00013', 'Juhász', 'Krisztián', 'Férfi', '1974-02-14', 'demo.ertekesites@pelda.hu', 'Kötetlen', NULL, NULL, NULL, NULL, 'Szellemi', 'Értékesítés'
  UNION ALL SELECT '00014', 'Mészáros', 'Dóra', 'Nő', '1975-03-15', 'demo.beszerzes@pelda.hu', 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Ügyvezetés'
  UNION ALL SELECT '00015', 'Oláh', 'Gergő', 'Férfi', '1976-04-16', 'demo.it@pelda.hu', 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Ügyvezetés'
  UNION ALL SELECT '00016', 'Simon', 'Rita', 'Nő', '1977-05-17', 'demo.villamos@pelda.hu', 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Villamos'
  UNION ALL SELECT '00017', 'Rácz', 'Ferenc', 'Férfi', '1978-06-18', 'demo.gepeszet@pelda.hu', 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Gépészeti'
  UNION ALL SELECT '00018', 'Fekete', 'Krisztina', 'Nő', '1979-07-19', 'demo.konyveles@pelda.hu', 'Kötetlen', NULL, NULL, NULL, NULL, 'Szellemi', 'Ügyvezetés'
  UNION ALL SELECT '00019', 'Szűcs', 'Norbert', 'Férfi', '1980-08-20', 'demo.muszakos@pelda.hu', 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Fizikai', 'Előkészítés A'
  UNION ALL SELECT '00020', 'Takács', 'Andrea', 'Nő', '1981-09-21', NULL, 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Fizikai', 'Előkészítés A'
  UNION ALL SELECT '00021', 'Fodor', 'Tibor', 'Férfi', '1982-10-22', NULL, 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Fizikai', 'Előkészítés A'
  UNION ALL SELECT '00022', 'Veres', 'Hajnalka', 'Nő', '1983-11-23', NULL, 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Fizikai', 'Előkészítés A'
  UNION ALL SELECT '00023', 'Orsós', 'Dávid', 'Férfi', '1984-12-24', NULL, 'Műszakos', '14:00-22:00', '18:00:00', '18:30:00', 30, 'Fizikai', 'Előkészítés B'
  UNION ALL SELECT '00024', 'Hegedűs', 'Margit', 'Nő', '1985-01-25', NULL, 'Műszakos', '14:00-22:00', '18:00:00', '18:30:00', 30, 'Fizikai', 'Előkészítés B'
  UNION ALL SELECT '00025', 'Barna', 'Máté', 'Férfi', '1986-02-26', NULL, 'Műszakos', '14:00-22:00', '18:00:00', '18:30:00', 30, 'Fizikai', 'Előkészítés B'
  UNION ALL SELECT '00026', 'Deák', 'Orsolya', 'Nő', '1987-03-27', NULL, 'Műszakos', '14:00-22:00', '18:00:00', '18:30:00', 30, 'Fizikai', 'Előkészítés B'
  UNION ALL SELECT '00027', 'Pintér', 'Balázs', 'Férfi', '1988-04-01', NULL, 'Műszakos', '22:00-06:00', '02:00:00', '02:30:00', 30, 'Fizikai', 'Előkészítés C'
  UNION ALL SELECT '00028', 'Bogdán', 'Renáta', 'Nő', '1989-05-02', NULL, 'Műszakos', '22:00-06:00', '02:00:00', '02:30:00', 30, 'Fizikai', 'Előkészítés C'
  UNION ALL SELECT '00029', 'Somogyi', 'Imre', 'Férfi', '1990-06-03', NULL, 'Műszakos', '22:00-06:00', '02:00:00', '02:30:00', 30, 'Fizikai', 'Előkészítés C'
  UNION ALL SELECT '00030', 'Király', 'Tünde', 'Nő', '1991-07-04', NULL, 'Műszakos', '22:00-06:00', '02:00:00', '02:30:00', 30, 'Fizikai', 'Előkészítés C'
  UNION ALL SELECT '00031', 'Antal', 'József', 'Férfi', '1992-08-05', NULL, 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Fizikai', 'Összeszerelés A'
  UNION ALL SELECT '00032', 'Vass', 'Zita', 'Nő', '1993-09-06', NULL, 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Fizikai', 'Összeszerelés A'
  UNION ALL SELECT '00033', 'Lengyel', 'Miklós', 'Férfi', '1994-10-07', NULL, 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Fizikai', 'Összeszerelés A'
  UNION ALL SELECT '00034', 'Gulyás', 'Bernadett', 'Nő', '1995-11-08', NULL, 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Fizikai', 'Összeszerelés A'
  UNION ALL SELECT '00035', 'Balla', 'Patrik', 'Férfi', '1996-12-09', NULL, 'Műszakos', '14:00-22:00', '18:00:00', '18:30:00', 30, 'Fizikai', 'Összeszerelés B'
  UNION ALL SELECT '00036', 'Bakos', 'Dalma', 'Nő', '1997-01-10', NULL, 'Műszakos', '14:00-22:00', '18:00:00', '18:30:00', 30, 'Fizikai', 'Összeszerelés B'
  UNION ALL SELECT '00037', 'Gáspár', 'Szilárd', 'Férfi', '1998-02-11', NULL, 'Műszakos', '14:00-22:00', '18:00:00', '18:30:00', 30, 'Fizikai', 'Összeszerelés B'
  UNION ALL SELECT '00038', 'Halász', 'Fanni', 'Nő', '1999-03-12', NULL, 'Műszakos', '14:00-22:00', '18:00:00', '18:30:00', 30, 'Fizikai', 'Összeszerelés B'
  UNION ALL SELECT '00039', 'Illés', 'Zalán', 'Férfi', '2000-04-13', NULL, 'Műszakos', '22:00-06:00', '02:00:00', '02:30:00', 30, 'Fizikai', 'Összeszerelés C'
  UNION ALL SELECT '00040', 'Jakab', 'Henrietta', 'Nő', '2001-05-14', NULL, 'Műszakos', '22:00-06:00', '02:00:00', '02:30:00', 30, 'Fizikai', 'Összeszerelés C'
  UNION ALL SELECT '00041', 'Katona', 'Bence', 'Férfi', '2002-06-15', NULL, 'Műszakos', '22:00-06:00', '02:00:00', '02:30:00', 30, 'Fizikai', 'Összeszerelés C'
  UNION ALL SELECT '00042', 'Kelemen', 'Katalin', 'Nő', '2003-07-16', NULL, 'Műszakos', '22:00-06:00', '02:00:00', '02:30:00', 30, 'Fizikai', 'Összeszerelés C'
  UNION ALL SELECT '00043', 'Lukács', 'István', 'Férfi', '2004-08-17', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Külföldi export'
  UNION ALL SELECT '00044', 'Magyar', 'Mária', 'Nő', '1962-09-18', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Külföldi export'
  UNION ALL SELECT '00045', 'Nemes', 'Zoltán', 'Férfi', '1963-10-19', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Belföldi export'
  UNION ALL SELECT '00046', 'Orbán', 'Ildikó', 'Nő', '1964-11-20', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Belföldi export'
  UNION ALL SELECT '00047', 'Pataki', 'Tamás', 'Férfi', '1965-12-21', NULL, 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Fizikai', 'Nyersanyag raktár'
  UNION ALL SELECT '00048', 'Rózsa', 'Judit', 'Nő', '1966-01-22', NULL, 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Fizikai', 'Nyersanyag raktár'
  UNION ALL SELECT '00049', 'Sipos', 'Sándor', 'Férfi', '1967-02-23', NULL, 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Fizikai', 'Nyersanyag raktár'
  UNION ALL SELECT '00050', 'Tamás', 'Zsuzsanna', 'Nő', '1968-03-24', NULL, 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Fizikai', 'Nyersanyag raktár'
  UNION ALL SELECT '00051', 'Ujvári', 'László', 'Férfi', '1969-04-25', NULL, 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Fizikai', 'Nyersanyag raktár'
  UNION ALL SELECT '00052', 'Vámos', 'Emese', 'Nő', '1970-05-26', NULL, 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Fizikai', 'Készáru raktár'
  UNION ALL SELECT '00053', 'Zsigmond', 'Krisztián', 'Férfi', '1971-06-27', NULL, 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Fizikai', 'Készáru raktár'
  UNION ALL SELECT '00054', 'Bálint', 'Dóra', 'Nő', '1972-07-01', NULL, 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Fizikai', 'Készáru raktár'
  UNION ALL SELECT '00055', 'Csonka', 'Gergő', 'Férfi', '1973-08-02', NULL, 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Fizikai', 'Készáru raktár'
  UNION ALL SELECT '00056', 'Domonkos', 'Rita', 'Nő', '1974-09-03', NULL, 'Műszakos', '06:00-14:00', '10:00:00', '10:30:00', 30, 'Fizikai', 'Készáru raktár'
  UNION ALL SELECT '00057', 'Erdei', 'Ferenc', 'Férfi', '1975-10-04', 'demo.irodai@pelda.hu', 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Értékesítés'
  UNION ALL SELECT '00058', 'Fülöp', 'Krisztina', 'Nő', '1976-11-05', 'demo.hr@pelda.hu', 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Értékesítés'
  UNION ALL SELECT '00059', 'Gombos', 'Norbert', 'Férfi', '1977-12-06', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Értékesítés'
  UNION ALL SELECT '00060', 'Hajdu', 'Andrea', 'Nő', '1978-01-07', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Értékesítés'
  UNION ALL SELECT '00061', 'Jónás', 'Tibor', 'Férfi', '1979-02-08', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Értékesítés'
  UNION ALL SELECT '00062', 'Kardos', 'Hajnalka', 'Nő', '1980-03-09', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Értékesítés'
  UNION ALL SELECT '00063', 'Lázár', 'Dávid', 'Férfi', '1981-04-10', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Értékesítés'
  UNION ALL SELECT '00064', 'Mezei', 'Margit', 'Nő', '1982-05-11', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Értékesítés'
  UNION ALL SELECT '00065', 'Nyári', 'Máté', 'Férfi', '1983-06-12', 'demo.inaktiv@pelda.hu', 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Nyersanyag beszerzés'
  UNION ALL SELECT '00066', 'Pál', 'Orsolya', 'Nő', '1984-07-13', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Nyersanyag beszerzés'
  UNION ALL SELECT '00067', 'Radnai', 'Balázs', 'Férfi', '1985-08-14', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Csomagolóanyag'
  UNION ALL SELECT '00068', 'Siklósi', 'Renáta', 'Nő', '1986-09-15', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Csomagolóanyag'
  UNION ALL SELECT '00069', 'Török', 'Imre', 'Férfi', '1987-10-16', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Fejlesztés'
  UNION ALL SELECT '00070', 'Vida', 'Tünde', 'Nő', '1988-11-17', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Fejlesztés'
  UNION ALL SELECT '00071', 'Bognár', 'József', 'Férfi', '1989-12-18', 'demo.admin@pelda.hu', 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Rendszergazda'
  UNION ALL SELECT '00072', 'Csorba', 'Zita', 'Nő', '1990-01-19', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Rendszergazda'
  UNION ALL SELECT '00073', 'Dudás', 'Miklós', 'Férfi', '1991-02-20', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Fizikai', 'Villamos'
  UNION ALL SELECT '00074', 'Endrész', 'Bernadett', 'Nő', '1992-03-21', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Fizikai', 'Villamos'
  UNION ALL SELECT '00075', 'Finta', 'Patrik', 'Férfi', '1993-04-22', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Fizikai', 'Villamos'
  UNION ALL SELECT '00076', 'Galambos', 'Dalma', 'Nő', '1994-05-23', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Fizikai', 'Gépészeti'
  UNION ALL SELECT '00077', 'Hornyák', 'Szilárd', 'Férfi', '1995-06-24', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Fizikai', 'Gépészeti'
  UNION ALL SELECT '00078', 'Izsák', 'Fanni', 'Nő', '1996-07-25', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Fizikai', 'Gépészeti'
  UNION ALL SELECT '00079', 'Juhos', 'Zalán', 'Férfi', '1997-08-26', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Könyvelés'
  UNION ALL SELECT '00080', 'Kaszás', 'Henrietta', 'Nő', '1998-09-27', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Könyvelés'
  UNION ALL SELECT '00081', 'Lantos', 'Bence', 'Férfi', '1999-10-01', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Könyvelés'
  UNION ALL SELECT '00082', 'Medve', 'Katalin', 'Nő', '2000-11-02', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Könyvelés'
  UNION ALL SELECT '00083', 'Nádas', 'István', 'Férfi', '2001-12-03', NULL, 'Nem műszakos', '07:00-15:00', '12:00:00', '12:30:00', 30, 'Szellemi', 'Könyvelés'
) v
JOIN WorkSchedules       w   ON w.work_schedule_name       = v.munkarend
JOIN EmployeeCategories  cat ON cat.employee_category_name = v.kategoria
JOIN UserGroups          g   ON g.user_group_name          = v.csoport
LEFT JOIN CoreHours      c   ON c.core_hour_name           = v.torzsido
WHERE NOT EXISTS (SELECT 1 FROM Employees e WHERE e.employee_code = v.kod);

UPDATE CompanySettings SET company_next_employee_code = 84
WHERE company_settings_id = 1;

INSERT INTO Users (
  user_username, user_password_hash, user_employee_id,
  user_role_id, user_status, user_must_change_password
)
SELECT v.nev, @hash, e.employee_id, r.user_role_id, v.allapot, 0
FROM (
            SELECT 'demo.tulajdonos' AS nev, '00001' AS kod, 'Vezető' AS szerepkor, 1 AS allapot
  UNION ALL SELECT 'demo.ugyvezeto', '00002', 'Vezető', 1
  UNION ALL SELECT 'demo.gyartas', '00003', 'Vezető', 1
  UNION ALL SELECT 'demo.elokeszites.a', '00004', 'Vezető', 1
  UNION ALL SELECT 'demo.elokeszites.b', '00005', 'Vezető', 1
  UNION ALL SELECT 'demo.elokeszites.c', '00006', 'Vezető', 1
  UNION ALL SELECT 'demo.osszeszereles.a', '00007', 'Vezető', 1
  UNION ALL SELECT 'demo.osszeszereles.b', '00008', 'Vezető', 1
  UNION ALL SELECT 'demo.osszeszereles.c', '00009', 'Vezető', 1
  UNION ALL SELECT 'demo.export', '00010', 'Vezető', 1
  UNION ALL SELECT 'demo.raktar.nyersanyag', '00011', 'Vezető', 1
  UNION ALL SELECT 'demo.raktar.keszaru', '00012', 'Vezető', 1
  UNION ALL SELECT 'demo.ertekesites', '00013', 'Vezető', 1
  UNION ALL SELECT 'demo.beszerzes', '00014', 'Vezető', 1
  UNION ALL SELECT 'demo.it', '00015', 'Vezető', 1
  UNION ALL SELECT 'demo.villamos', '00016', 'Vezető', 1
  UNION ALL SELECT 'demo.gepeszet', '00017', 'Vezető', 1
  UNION ALL SELECT 'demo.konyveles', '00018', 'Vezető', 1
  UNION ALL SELECT 'demo.muszakos', '00019', 'Dolgozó', 1
  UNION ALL SELECT 'demo.irodai', '00057', 'Dolgozó', 1
  UNION ALL SELECT 'demo.hr', '00058', 'HR-Bér', 1
  UNION ALL SELECT 'demo.inaktiv', '00065', 'Dolgozó', 0
  UNION ALL SELECT 'demo.admin', '00071', 'Admin', 1
) v
JOIN Employees e ON e.employee_code  = v.kod
JOIN UserRoles r ON r.user_role_name = v.szerepkor
WHERE NOT EXISTS (SELECT 1 FROM Users u WHERE u.user_username = v.nev);

SET SQL_SAFE_UPDATES = @elozo_safe_updates;

SELECT g.user_group_name AS csoport, COUNT(e.employee_id) AS letszam,
       SUM(CASE WHEN u.user_id IS NOT NULL THEN 1 ELSE 0 END) AS fiokkal
FROM UserGroups g
LEFT JOIN Employees e ON e.employee_user_group_id = g.user_group_id
LEFT JOIN Users     u ON u.user_employee_id       = e.employee_id
GROUP BY g.user_group_name
ORDER BY g.user_group_name;

SELECT w.work_schedule_name AS munkarend, COUNT(*) AS letszam
FROM Employees e
JOIN WorkSchedules w ON w.work_schedule_id = e.employee_work_schedule_id
GROUP BY w.work_schedule_name;
