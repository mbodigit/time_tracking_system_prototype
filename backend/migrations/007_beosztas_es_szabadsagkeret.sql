USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @van_oszlop := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'WorkingTimeTracking'
    AND COLUMN_NAME = 'wtt_schedule_start'
);

SET @sql := IF(@van_oszlop = 0, '
  ALTER TABLE WorkingTimeTracking
    ADD COLUMN wtt_schedule_start DATETIME NULL AFTER wtt_working_end,
    ADD COLUMN wtt_schedule_end   DATETIME NULL AFTER wtt_schedule_start',
  'SELECT ''A beosztás oszlopai már léteznek'' AS allapot');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @van_chk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'WorkingTimeTracking'
    AND CONSTRAINT_NAME = 'chk_wtt_schedule_order'
);

SET @sql := IF(@van_chk = 0, '
  ALTER TABLE WorkingTimeTracking
    ADD CONSTRAINT chk_wtt_schedule_order CHECK (
      wtt_schedule_start IS NULL OR wtt_schedule_end IS NULL
      OR wtt_schedule_end >= wtt_schedule_start
    )',
  'SELECT ''Az értékellenőrzés már létezik'' AS allapot');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @van_szabadsag := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Employees'
    AND COLUMN_NAME = 'employee_annual_leave_days'
);

SET @sql := IF(@van_szabadsag = 0, '
  ALTER TABLE Employees
    ADD COLUMN employee_annual_leave_days INT NULL AFTER employee_manager_id',
  'SELECT ''A szabadságkeret oszlopa már létezik'' AS allapot');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COLUMN_NAME    AS oszlop,
       COLUMN_TYPE    AS tipus,
       IS_NULLABLE    AS lehet_ures
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('WorkingTimeTracking', 'Employees')
  AND COLUMN_NAME IN ('wtt_schedule_start', 'wtt_schedule_end',
                      'employee_annual_leave_days');

SELECT CONSTRAINT_NAME AS megszoritas, CONSTRAINT_TYPE AS tipus
FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'WorkingTimeTracking'
ORDER BY CONSTRAINT_TYPE, CONSTRAINT_NAME;
