USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

UPDATE Allowances SET allowance_percent =  50.00
WHERE allowance_name = 'Hétköznapi túlóra';

UPDATE Allowances SET allowance_percent = 100.00
WHERE allowance_name = 'Szombati túlóra';

UPDATE Allowances SET allowance_percent = 100.00
WHERE allowance_name = 'Pihenőnapi túlóra';

UPDATE Allowances SET allowance_percent = 200.00
WHERE allowance_name = 'Vasárnapi túlóra';

UPDATE Allowances SET allowance_percent = 200.00
WHERE allowance_name = 'Ünnepnapi túlóra';

UPDATE Allowances SET allowance_name = 'Munkaszüneti napi túlóra'
WHERE allowance_name = 'Ünnepnapi túlóra';

SET SQL_SAFE_UPDATES = @elozo_safe_updates;

SELECT allowance_name       AS jogcim,
       allowance_percent    AS szazalek,
       allowance_start_hour AS kezdet,
       allowance_end_hour   AS veg
FROM Allowances
ORDER BY allowance_percent, allowance_name;