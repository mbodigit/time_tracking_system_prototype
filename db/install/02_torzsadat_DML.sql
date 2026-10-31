USE time_tracking_db_prototype;

SET NAMES utf8mb4;

INSERT INTO EmployeeStatus (employee_status_name, employee_status_is_active)
SELECT v.nev, v.aktiv FROM (
            SELECT 'Aktív'                             AS nev, 1 AS aktiv
  UNION ALL SELECT 'Felmondással aktív',                    1
  UNION ALL SELECT 'Felmondással felmentve',                1
  UNION ALL SELECT 'Tartós távollét (csed/gyed/gyes)',      1
  UNION ALL SELECT 'Fizetés nélküli tartós távollét',       1
  UNION ALL SELECT 'Betegség miatti tartós távollét',       1
  UNION ALL SELECT 'Kilépett',                              0
  UNION ALL SELECT 'Elhunyt',                               0
) v
WHERE NOT EXISTS (
  SELECT 1 FROM EmployeeStatus s WHERE s.employee_status_name = v.nev
);

INSERT INTO EmployeeCategories (employee_category_name)
SELECT v.nev FROM (
            SELECT 'Szellemi' AS nev
  UNION ALL SELECT 'Fizikai'
) v
WHERE NOT EXISTS (
  SELECT 1 FROM EmployeeCategories c WHERE c.employee_category_name = v.nev
);

INSERT INTO CostCenters (cost_center_name, cost_center_code)
SELECT 'Központ', 'KP'
WHERE NOT EXISTS (
  SELECT 1 FROM CostCenters WHERE cost_center_code = 'KP'
);

INSERT INTO WorkSchedules (work_schedule_name, work_schedule_is_shift)
SELECT v.nev, v.muszakos FROM (
            SELECT 'Műszakos'     AS nev, 1 AS muszakos
  UNION ALL SELECT 'Nem műszakos',      0
  UNION ALL SELECT 'Kötetlen',          0
) v
WHERE NOT EXISTS (
  SELECT 1 FROM WorkSchedules w WHERE w.work_schedule_name = v.nev
);

INSERT INTO WorkingHours (working_hour_num, working_hour_name)
SELECT v.ora, v.nev FROM (
            SELECT 4 AS ora, '4 órás' AS nev
  UNION ALL SELECT 6,        '6 órás'
  UNION ALL SELECT 7,        '7 órás'
  UNION ALL SELECT 8,        '8 órás'
) v
WHERE NOT EXISTS (
  SELECT 1 FROM WorkingHours h WHERE h.working_hour_num = v.ora
);

INSERT INTO CoreHours (core_hour_name, core_hour_start, core_hour_end)
SELECT v.nev, v.kezd, v.veg FROM (
            SELECT '06:00-14:00' AS nev, '06:00:00' AS kezd, '14:00:00' AS veg
  UNION ALL SELECT '07:00-15:00',        '07:00:00',         '15:00:00'
  UNION ALL SELECT '14:00-22:00',        '14:00:00',         '22:00:00'
  UNION ALL SELECT '22:00-06:00',        '22:00:00',         '06:00:00'
) v
WHERE NOT EXISTS (
  SELECT 1 FROM CoreHours c WHERE c.core_hour_name = v.nev
);

INSERT INTO CompanySettings (
  company_settings_id, company_base_payroll_code, company_next_employee_code
)
SELECT 1, 'ALAP', 1
WHERE NOT EXISTS (
  SELECT 1 FROM CompanySettings WHERE company_settings_id = 1
);
