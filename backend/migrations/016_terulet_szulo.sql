USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

SET @oszlop_letezik := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Areas'
    AND COLUMN_NAME = 'area_parent_id'
);

SET @parancs := IF(@oszlop_letezik = 0, '
  ALTER TABLE Areas
    ADD COLUMN area_parent_id INT NULL,
    ADD KEY idx_area_parent (area_parent_id),
    ADD CONSTRAINT fk_area_parent
      FOREIGN KEY (area_parent_id) REFERENCES Areas(area_id)
      ON DELETE SET NULL',
  'SELECT 1');

PREPARE terulet_szulo FROM @parancs;
EXECUTE terulet_szulo;
DEALLOCATE PREPARE terulet_szulo;

SET SQL_SAFE_UPDATES = @elozo_safe_updates;

SELECT a.area_id, a.area_name, a.area_parent_id, p.area_name AS szulo
FROM Areas a
LEFT JOIN Areas p ON p.area_id = a.area_parent_id
ORDER BY a.area_name;