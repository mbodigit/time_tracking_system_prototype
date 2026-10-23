USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

SET @oszlop_letezik := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Areas'
    AND COLUMN_NAME = 'area_manager_id'
);

SET @parancs := IF(@oszlop_letezik = 0, '
  ALTER TABLE Areas
    ADD COLUMN area_manager_id INT NULL,
    ADD KEY idx_area_manager (area_manager_id),
    ADD CONSTRAINT fk_area_manager
      FOREIGN KEY (area_manager_id) REFERENCES Users(user_id)
      ON DELETE SET NULL',
  'SELECT 1');

PREPARE terulet_vezeto FROM @parancs;
EXECUTE terulet_vezeto;
DEALLOCATE PREPARE terulet_vezeto;

SET @oszlop_letezik := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Departments'
    AND COLUMN_NAME = 'department_manager_id'
);

SET @parancs := IF(@oszlop_letezik = 0, '
  ALTER TABLE Departments
    ADD COLUMN department_manager_id INT NULL,
    ADD KEY idx_department_manager (department_manager_id),
    ADD CONSTRAINT fk_department_manager
      FOREIGN KEY (department_manager_id) REFERENCES Users(user_id)
      ON DELETE SET NULL',
  'SELECT 1');

PREPARE reszleg_vezeto FROM @parancs;
EXECUTE reszleg_vezeto;
DEALLOCATE PREPARE reszleg_vezeto;

SET @oszlop_letezik := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Shifts'
    AND COLUMN_NAME = 'shift_manager_id'
);

SET @parancs := IF(@oszlop_letezik = 0, '
  ALTER TABLE Shifts
    ADD COLUMN shift_manager_id INT NULL,
    ADD KEY idx_shift_manager (shift_manager_id),
    ADD CONSTRAINT fk_shift_manager
      FOREIGN KEY (shift_manager_id) REFERENCES Users(user_id)
      ON DELETE SET NULL',
  'SELECT 1');

PREPARE muszak_vezeto FROM @parancs;
EXECUTE muszak_vezeto;
DEALLOCATE PREPARE muszak_vezeto;

SET SQL_SAFE_UPDATES = @elozo_safe_updates;

SELECT 'Areas' AS tabla, area_id AS azonosito, area_name AS megnevezes,
       area_manager_id AS vezeto
FROM Areas
UNION ALL
SELECT 'Departments', department_id, department_name, department_manager_id
FROM Departments
UNION ALL
SELECT 'Shifts', shift_id, shift_name, shift_manager_id
FROM Shifts;