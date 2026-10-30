USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

UPDATE GlobalCalendar
SET gl_cal_day_type = 'Áthelyezett munkanap'
WHERE gl_cal_day_type = 'Munkanap';

SET SQL_SAFE_UPDATES = @elozo_safe_updates;

SELECT gl_cal_day_type AS naptipus, COUNT(*) AS db
FROM GlobalCalendar
GROUP BY gl_cal_day_type
ORDER BY gl_cal_day_type;