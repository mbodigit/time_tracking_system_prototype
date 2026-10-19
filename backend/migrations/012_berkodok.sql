USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

SET @oszlop_letezik := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Allowances'
    AND COLUMN_NAME = 'allowance_payroll_code'
);

SET @parancs := IF(@oszlop_letezik = 0,
  'ALTER TABLE Allowances ADD COLUMN allowance_payroll_code VARCHAR(20) NULL AFTER allowance_code',
  'SELECT 1');

PREPARE potlek_berkod FROM @parancs;
EXECUTE potlek_berkod;
DEALLOCATE PREPARE potlek_berkod;

SET @oszlop_letezik := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Absences'
    AND COLUMN_NAME = 'absence_payroll_code'
);

SET @parancs := IF(@oszlop_letezik = 0,
  'ALTER TABLE Absences ADD COLUMN absence_payroll_code VARCHAR(20) NULL AFTER absence_name',
  'SELECT 1');

PREPARE jogcim_berkod FROM @parancs;
EXECUTE jogcim_berkod;
DEALLOCATE PREPARE jogcim_berkod;

SET @oszlop_letezik := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'CompanySettings'
    AND COLUMN_NAME = 'company_base_payroll_code'
);

SET @parancs := IF(@oszlop_letezik = 0,
  'ALTER TABLE CompanySettings ADD COLUMN company_base_payroll_code VARCHAR(20) NULL',
  'SELECT 1');

PREPARE alap_berkod FROM @parancs;
EXECUTE alap_berkod;
DEALLOCATE PREPARE alap_berkod;

UPDATE CompanySettings SET company_base_payroll_code = 'ALAP'
WHERE company_settings_id = 1;

UPDATE Allowances SET allowance_payroll_code = 'POT15'    WHERE allowance_code = 'delutani';
UPDATE Allowances SET allowance_payroll_code = 'POT30'    WHERE allowance_code = 'ejszakai';
UPDATE Allowances SET allowance_payroll_code = 'TUL50'    WHERE allowance_code = 'tulora';
UPDATE Allowances SET allowance_payroll_code = 'TUL100SZ' WHERE allowance_code = 'szombat';
UPDATE Allowances SET allowance_payroll_code = 'TUL100PN' WHERE allowance_code = 'pihenonap';
UPDATE Allowances SET allowance_payroll_code = 'TUL200VA' WHERE allowance_code = 'vasarnap';
UPDATE Allowances SET allowance_payroll_code = 'TUL200MU' WHERE allowance_code = 'munkaszuneti';

UPDATE Absences SET absence_payroll_code = 'SZAB'    WHERE absence_name = 'Fizetett szabadság';
UPDATE Absences SET absence_payroll_code = 'BETEG'   WHERE absence_name = 'Betegség';
UPDATE Absences SET absence_payroll_code = 'IFT'     WHERE absence_name = 'Igazolt fizetett távollét';
UPDATE Absences SET absence_payroll_code = 'INFT'    WHERE absence_name = 'Igazolt nem fizetett távollét';
UPDATE Absences SET absence_payroll_code = 'IGTLAN'  WHERE absence_name = 'Igazolatlan távollét';
UPDATE Absences SET absence_payroll_code = 'FNSZ'    WHERE absence_name = 'Fizetés nélküli szabadság';
UPDATE Absences SET absence_payroll_code = 'GYASZ'   WHERE absence_name = 'Hozzátartozó halála';
UPDATE Absences SET absence_payroll_code = 'APANAP'  WHERE absence_name = 'Apanap';
UPDATE Absences SET absence_payroll_code = 'FELMENT' WHERE absence_name = 'Felmentési idő';
UPDATE Absences SET absence_payroll_code = 'FIZNAP'  WHERE absence_name = 'Fizetett nap';
UPDATE Absences SET absence_payroll_code = 'UNNEP'   WHERE absence_name = 'Ünnepnap';
UPDATE Absences SET absence_payroll_code = 'PIHENO'  WHERE absence_name = 'Pihenőnap';
UPDATE Absences SET absence_payroll_code = 'HOFFICE' WHERE absence_name = 'Homeoffice';
UPDATE Absences SET absence_payroll_code = 'CSUSZO'  WHERE absence_name = 'Csúszó nap';
UPDATE Absences SET absence_payroll_code = 'KIKULD'  WHERE absence_name = 'Külföldi kiküldetés';
UPDATE Absences SET absence_payroll_code = 'TANSZAB' WHERE absence_name = 'Tanulmányi szabadság';

SET SQL_SAFE_UPDATES = @elozo_safe_updates;

SELECT allowance_code AS kod, allowance_name AS jogcim,
       allowance_payroll_code AS berkod
FROM Allowances ORDER BY allowance_percent, allowance_name;

SELECT absence_name AS jogcim, absence_payroll_code AS berkod
FROM Absences ORDER BY absence_sort;
