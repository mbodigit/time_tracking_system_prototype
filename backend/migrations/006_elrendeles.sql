USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @van_oszlop := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'WorkingTimeTracking'
    AND COLUMN_NAME = 'wtt_is_ordered'
);

SET @sql := IF(@van_oszlop = 0, '
  ALTER TABLE WorkingTimeTracking
    ADD COLUMN wtt_is_ordered BOOLEAN NOT NULL DEFAULT 0 AFTER wtt_absence_id,
    ADD COLUMN wtt_ordered_by INT NULL AFTER wtt_is_ordered',
  'SELECT ''Az oszlopok már léteznek'' AS allapot');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @van_fk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'WorkingTimeTracking'
    AND CONSTRAINT_NAME = 'fk_wtt_ordered_by'
);

SET @sql := IF(@van_fk = 0, '
  ALTER TABLE WorkingTimeTracking
    ADD CONSTRAINT fk_wtt_ordered_by
    FOREIGN KEY (wtt_ordered_by) REFERENCES Users(user_id)
    ON DELETE SET NULL',
  'SELECT ''Az idegen kulcs már létezik'' AS allapot');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @van_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'WorkingTimeTracking'
    AND INDEX_NAME = 'idx_wtt_ordered'
);

SET @sql := IF(@van_idx = 0, '
  ALTER TABLE WorkingTimeTracking
    ADD KEY idx_wtt_ordered (wtt_is_ordered)',
  'SELECT ''Az index már létezik'' AS allapot');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COLUMN_NAME     AS oszlop,
       COLUMN_TYPE     AS tipus,
       IS_NULLABLE     AS lehet_ures,
       COLUMN_DEFAULT  AS alapertelmezes
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'WorkingTimeTracking'
  AND COLUMN_NAME IN ('wtt_is_ordered', 'wtt_ordered_by');

SELECT CONSTRAINT_NAME AS megszoritas, CONSTRAINT_TYPE AS tipus
FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'WorkingTimeTracking'
ORDER BY CONSTRAINT_TYPE, CONSTRAINT_NAME;
