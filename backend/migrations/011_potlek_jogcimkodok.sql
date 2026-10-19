USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

SET @oszlop_letezik := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Allowances'
    AND COLUMN_NAME = 'allowance_code'
);

SET @parancs := IF(@oszlop_letezik = 0,
  'ALTER TABLE Allowances ADD COLUMN allowance_code VARCHAR(30) NULL AFTER allowance_name',
  'SELECT 1');

PREPARE jogcim_oszlop FROM @parancs;
EXECUTE jogcim_oszlop;
DEALLOCATE PREPARE jogcim_oszlop;

UPDATE Allowances SET allowance_code = 'delutani'
WHERE allowance_name = 'Délutáni műszakpótlék';

UPDATE Allowances SET allowance_code = 'ejszakai'
WHERE allowance_name = 'Éjszakai műszakpótlék';

UPDATE Allowances SET allowance_code = 'tulora'
WHERE allowance_name = 'Hétköznapi túlóra';

UPDATE Allowances SET allowance_code = 'szombat'
WHERE allowance_name = 'Szombati túlóra';

UPDATE Allowances SET allowance_code = 'pihenonap'
WHERE allowance_name = 'Pihenőnapi túlóra';

UPDATE Allowances SET allowance_code = 'vasarnap'
WHERE allowance_name = 'Vasárnapi túlóra';

UPDATE Allowances SET allowance_code = 'munkaszuneti'
WHERE allowance_name = 'Munkaszüneti napi túlóra';

SET @kulcs_letezik := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Allowances'
    AND INDEX_NAME = 'uq_allowance_code'
);

SET @parancs := IF(@kulcs_letezik = 0,
  'ALTER TABLE Allowances ADD UNIQUE KEY uq_allowance_code (allowance_code)',
  'SELECT 1');

PREPARE jogcim_kulcs FROM @parancs;
EXECUTE jogcim_kulcs;
DEALLOCATE PREPARE jogcim_kulcs;

SET SQL_SAFE_UPDATES = @elozo_safe_updates;

SELECT allowance_id      AS azonosito,
       allowance_code    AS kod,
       allowance_name    AS jogcim,
       allowance_percent AS szazalek
FROM Allowances
ORDER BY allowance_percent, allowance_name;