USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

DELETE FROM GlobalCalendar
WHERE gl_cal_note IN ('Húsvétvasárnap', 'Pünkösdvasárnap');

UPDATE GlobalCalendar
SET gl_cal_day_type = 'Munkaszüneti nap'
WHERE gl_cal_day_type = 'Ünnepnap';

SET SQL_SAFE_UPDATES = @elozo_safe_updates;

SELECT gl_cal_date     AS datum,
       gl_cal_day_type AS naptipus,
       gl_cal_note     AS megjegyzes
FROM GlobalCalendar
ORDER BY gl_cal_date;

SELECT gl_cal_day_type AS naptipus, COUNT(*) AS darab
FROM GlobalCalendar
GROUP BY gl_cal_day_type;
