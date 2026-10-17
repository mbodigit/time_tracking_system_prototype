USE time_tracking_db_prototype;

USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

DELETE s FROM AbsenceWorkSchedules s
JOIN Absences      a ON a.absence_id       = s.absence_id
JOIN WorkSchedules w ON w.work_schedule_id = s.work_schedule_id
WHERE a.absence_name IN ('Homeoffice', 'Csúszó nap')
  AND w.work_schedule_name = 'Kötetlen';

SET SQL_SAFE_UPDATES = @elozo_safe_updates;

SELECT a.absence_name, GROUP_CONCAT(w.work_schedule_name ORDER BY w.work_schedule_id) AS munkarendek
FROM Absences a
JOIN AbsenceWorkSchedules s ON s.absence_id = a.absence_id
JOIN WorkSchedules        w ON w.work_schedule_id = s.work_schedule_id
GROUP BY a.absence_name
HAVING a.absence_name IN ('Homeoffice', 'Csúszó nap', 'Külföldi kiküldetés', 'Tanulmányi szabadság');