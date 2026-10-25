USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

SET @oszlop_letezik := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'CompanySettings'
    AND COLUMN_NAME = 'company_next_employee_code'
);

SET @parancs := IF(@oszlop_letezik = 0,
  'ALTER TABLE CompanySettings ADD COLUMN company_next_employee_code INT NOT NULL DEFAULT 1',
  'SELECT 1');

PREPARE kod_sorszam FROM @parancs;
EXECUTE kod_sorszam;
DEALLOCATE PREPARE kod_sorszam;

UPDATE CompanySettings
SET company_next_employee_code = 1
WHERE company_settings_id = 1 AND company_next_employee_code < 1;

SET @oszlop_letezik := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'CostCenters'
    AND COLUMN_NAME = 'cost_center_next_employee_seq'
);

SET @parancs := IF(@oszlop_letezik = 1,
  'ALTER TABLE CostCenters DROP COLUMN cost_center_next_employee_seq',
  'SELECT 1');

PREPARE regi_sorszam FROM @parancs;
EXECUTE regi_sorszam;
DEALLOCATE PREPARE regi_sorszam;

SET SQL_SAFE_UPDATES = @elozo_safe_updates;

SELECT company_settings_id       AS azonosito,
       company_next_employee_code AS kovetkezo_dolgozoi_kod
FROM CompanySettings;