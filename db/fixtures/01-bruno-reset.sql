USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

DROP TEMPORARY TABLE IF EXISTS bruno_alanyok;

CREATE TEMPORARY TABLE bruno_alanyok (employee_id INT NOT NULL PRIMARY KEY) ENGINE=InnoDB;

INSERT INTO bruno_alanyok (employee_id)
SELECT DISTINCT u.user_employee_id
FROM Users u
WHERE u.user_employee_id IS NOT NULL
  AND u.user_username IN (
    'demo.elokeszites.a', 'demo.elokeszites.b', 'demo.muszakos',
    'demo.ertekesites', 'demo.irodai', 'demo.hr', 'demo.admin',
    'demo.konyveles', 'demo.beszerzes'
  );

DELETE FROM Requests
WHERE request_employee_id IN (SELECT employee_id FROM bruno_alanyok)
  AND request_start_date >= CURDATE();

DELETE FROM WorkingTimeTracking
WHERE wtt_employee_id IN (SELECT employee_id FROM bruno_alanyok)
  AND (wtt_working_date >= DATE_SUB(CURDATE(), INTERVAL 4 DAY)
       OR wtt_working_date IN ('2026-01-05', '2026-01-06'))
  AND wtt_id <> 900001;

DELETE FROM Requests
WHERE request_employee_id IN (
  SELECT employee_id FROM Employees WHERE employee_last_name = 'Bruno'
);

DELETE FROM WorkingTimeTracking
WHERE wtt_employee_id IN (
  SELECT employee_id FROM Employees WHERE employee_last_name = 'Bruno'
);

DELETE FROM Users
WHERE user_employee_id IN (
  SELECT employee_id FROM Employees WHERE employee_last_name = 'Bruno'
);

DELETE FROM Employees WHERE employee_last_name = 'Bruno';

DELETE FROM UserGroups  WHERE user_group_name  LIKE 'Bruno teszt%';
DELETE FROM Shifts      WHERE shift_name       LIKE 'Bruno teszt%';
DELETE FROM Departments WHERE department_name  LIKE 'Bruno teszt%';
DELETE FROM Areas       WHERE area_name        LIKE 'Bruno%';

DELETE FROM GlobalCalendar WHERE gl_cal_note LIKE 'Bruno teszt%';

DELETE FROM AbsenceWorkSchedules
WHERE absence_id IN (SELECT absence_id FROM Absences WHERE absence_name LIKE 'Bruno%');

DELETE FROM Absences WHERE absence_name LIKE 'Bruno%';

DELETE FROM WorkScheduleAllowances
WHERE work_schedule_id IN
      (SELECT work_schedule_id FROM WorkSchedules WHERE work_schedule_name LIKE 'Bruno%');

DELETE FROM WorkSchedules WHERE work_schedule_name LIKE 'Bruno%';
DELETE FROM WorkingHours  WHERE working_hour_name  LIKE 'Bruno%';
DELETE FROM CoreHours     WHERE core_hour_name     LIKE 'Bruno%';
DELETE FROM CostCenters   WHERE cost_center_code   = 'BRUNO';
DELETE FROM PayrollCodes  WHERE payroll_code        = 'BRJ';

INSERT INTO PayrollCodes (payroll_code, payroll_code_name, payroll_code_is_base)
SELECT 'BRJ', 'Bruno teszt bérkód', 0
WHERE NOT EXISTS (
  SELECT 1 FROM PayrollCodes WHERE payroll_code = 'BRJ'
);

SET @muszakos_dolgozo := (
  SELECT user_employee_id FROM Users WHERE user_username = 'demo.muszakos'
);

INSERT IGNORE INTO WorkingTimeTracking (
  wtt_id, wtt_employee_id, wtt_working_date, wtt_working_start, wtt_working_end
) VALUES (
  900001, @muszakos_dolgozo, '2026-01-05', '2026-01-05 08:00:00', '2026-01-05 16:00:00'
);

DROP TEMPORARY TABLE bruno_alanyok;

SET SQL_SAFE_UPDATES = @elozo;

SELECT 'Bruno maradek' AS ellenorzes,
       (SELECT COUNT(*) FROM Employees WHERE employee_last_name = 'Bruno') AS dolgozo,
       (SELECT COUNT(*) FROM Absences WHERE absence_name LIKE 'Bruno%')    AS jogcim,
       (SELECT COUNT(*) FROM CoreHours WHERE core_hour_name LIKE 'Bruno%') AS torzsido,
       (SELECT COUNT(*) FROM Areas WHERE area_name LIKE 'Bruno%')          AS terulet,
       (SELECT COUNT(*) FROM PayrollCodes WHERE payroll_code = 'BRJ')       AS szabad_berkod;

SELECT wtt_id, wtt_employee_id, wtt_working_date
FROM WorkingTimeTracking WHERE wtt_id = 900001;
