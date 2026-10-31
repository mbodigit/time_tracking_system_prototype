USE time_tracking_db_prototype;

SET @elozo := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

DELETE FROM WorkingTimeTracking
WHERE wtt_employee_id IN (
        SELECT employee_id FROM Employees WHERE employee_code LIKE 'TESZT-%'
      )
  AND wtt_id <> 900001;

DELETE FROM Requests
WHERE request_employee_id IN (
  SELECT employee_id FROM Employees WHERE employee_code LIKE 'TESZT-%'
);

DELETE FROM Users
WHERE user_employee_id IN (
  SELECT employee_id FROM Employees WHERE employee_last_name = 'Bruno'
);

DELETE FROM Employees WHERE employee_last_name = 'Bruno';

DELETE FROM UserGroups WHERE user_group_name LIKE 'Bruno teszt%';

DELETE FROM Shifts      WHERE shift_name       LIKE 'Bruno teszt%';
DELETE FROM Departments WHERE department_name  LIKE 'Bruno teszt%';
DELETE FROM Areas       WHERE area_name        LIKE 'Bruno teszt%';

DELETE FROM GlobalCalendar WHERE gl_cal_note LIKE 'Bruno teszt%';

SET @dm := (SELECT employee_id FROM Employees WHERE employee_code = 'TESZT-DM1');

INSERT IGNORE INTO WorkingTimeTracking (
  wtt_id, wtt_employee_id, wtt_working_date, wtt_working_start, wtt_working_end
) VALUES (
  900001, @dm, '2026-01-05', '2026-01-05 08:00:00', '2026-01-05 16:00:00'
);

SET SQL_SAFE_UPDATES = @elozo;

SELECT wtt_id, wtt_employee_id, wtt_working_date
FROM WorkingTimeTracking
WHERE wtt_employee_id IN (
        SELECT employee_id FROM Employees WHERE employee_code LIKE 'TESZT-%'
      )
ORDER BY wtt_id;
DELETE FROM AbsenceWorkSchedules
WHERE absence_id IN (SELECT absence_id FROM Absences WHERE absence_name LIKE 'Bruno%');

DELETE FROM Absences WHERE absence_name LIKE 'Bruno%';

DELETE FROM WorkScheduleAllowances
WHERE work_schedule_id IN
      (SELECT work_schedule_id FROM WorkSchedules WHERE work_schedule_name LIKE 'Bruno%');

DELETE FROM WorkSchedules WHERE work_schedule_name LIKE 'Bruno%';

DELETE FROM WorkingHours WHERE working_hour_name LIKE 'Bruno%';

DELETE FROM CoreHours WHERE core_hour_name LIKE 'Bruno%';

DELETE FROM CostCenters WHERE cost_center_code = 'BRUNO';

SELECT 'Absences' AS tabla, COUNT(*) AS bruno_maradek
FROM Absences WHERE absence_name LIKE 'Bruno%'
UNION ALL SELECT 'WorkSchedules', COUNT(*) FROM WorkSchedules
          WHERE work_schedule_name LIKE 'Bruno%'
UNION ALL SELECT 'WorkingHours', COUNT(*) FROM WorkingHours
          WHERE working_hour_name LIKE 'Bruno%'
UNION ALL SELECT 'CoreHours', COUNT(*) FROM CoreHours
          WHERE core_hour_name LIKE 'Bruno%'
UNION ALL SELECT 'CostCenters', COUNT(*) FROM CostCenters
          WHERE cost_center_code = 'BRUNO';
