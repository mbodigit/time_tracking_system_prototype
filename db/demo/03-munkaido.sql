USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

SET @kezdo_nap := '2026-08-01';
SET @zaro_nap  := CURDATE();

DELETE FROM WorkingTimeTracking
WHERE wtt_employee_id IN (
  SELECT employee_id FROM Employees WHERE employee_code LIKE 'DEMO-%'
);

DELETE FROM Requests
WHERE request_employee_id IN (
  SELECT employee_id FROM Employees WHERE employee_code LIKE 'DEMO-%'
);

INSERT INTO Requests (
  request_employee_id, request_absence_id,
  request_start_date, request_end_date,
  request_status, request_message,
  request_decision_by, request_decision_at
)
SELECT e.employee_id, a.absence_id, v.kezdet, v.veg, 'Jóváhagyva', 'Demo adat',
       (SELECT user_id FROM Users WHERE user_username = 'demo.kiraly'), NOW()
FROM (
            SELECT 'DEMO-001' AS kod, 'Fizetett szabadság'         AS jogcim, '2026-08-10' AS kezdet, '2026-08-14' AS veg
  UNION ALL SELECT 'DEMO-002', 'Betegség',                   '2026-08-19', '2026-08-21'
  UNION ALL SELECT 'DEMO-003', 'Fizetett szabadság',         '2026-09-07', '2026-09-11'
  UNION ALL SELECT 'DEMO-004', 'Apanap',                     '2026-09-15', '2026-09-16'
  UNION ALL SELECT 'DEMO-005', 'Fizetett szabadság',         '2026-10-05', '2026-10-09'
  UNION ALL SELECT 'DEMO-006', 'Betegség',                   '2026-09-23', '2026-09-25'
  UNION ALL SELECT 'DEMO-008', 'Fizetett szabadság',         '2026-08-24', '2026-08-28'
  UNION ALL SELECT 'DEMO-010', 'Igazolt fizetett távollét',  '2026-10-13', '2026-10-13'
  UNION ALL SELECT 'DEMO-011', 'Fizetett szabadság',         '2026-10-19', '2026-10-23'
  UNION ALL SELECT 'DEMO-013', 'Betegség',                   '2026-10-01', '2026-10-02'
  UNION ALL SELECT 'DEMO-016', 'Fizetett szabadság',         '2026-08-03', '2026-08-07'
  UNION ALL SELECT 'DEMO-018', 'Betegség',                   '2026-09-02', '2026-09-04'
  UNION ALL SELECT 'DEMO-021', 'Fizetett szabadság',         '2026-09-28', '2026-10-02'
  UNION ALL SELECT 'DEMO-023', 'Igazolt fizetett távollét',  '2026-08-17', '2026-08-17'
  UNION ALL SELECT 'DEMO-025', 'Fizetett szabadság',         '2026-10-12', '2026-10-16'
  UNION ALL SELECT 'DEMO-026', 'Betegség',                   '2026-09-09', '2026-09-10'
  UNION ALL SELECT 'DEMO-028', 'Fizetett szabadság',         '2026-08-24', '2026-08-26'
  UNION ALL SELECT 'DEMO-033', 'Fizetett szabadság',         '2026-09-21', '2026-09-25'
  UNION ALL SELECT 'DEMO-034', 'Betegség',                   '2026-10-06', '2026-10-07'
) v
JOIN Employees e ON e.employee_code = v.kod
JOIN Absences  a ON a.absence_name  = v.jogcim;

INSERT INTO WorkingTimeTracking (
  wtt_employee_id, wtt_working_date,
  wtt_working_start, wtt_working_end,
  wtt_brk_start, wtt_brk_end,
  wtt_is_ordered, wtt_note
)
WITH RECURSIVE naptar AS (
  SELECT @kezdo_nap AS nap
  UNION ALL
  SELECT DATE_ADD(nap, INTERVAL 1 DAY) FROM naptar WHERE nap < @zaro_nap
),
dolgozo AS (
  SELECT e.employee_id,
         e.employee_code,
         COALESCE(e.employee_core_start, c.core_hour_start) AS kezdes,
         CAST(RIGHT(e.employee_code, 3) AS UNSIGNED)        AS sorszam
  FROM Employees e
  LEFT JOIN CoreHours     c ON c.core_hour_id     = e.employee_core_hour_id
  JOIN WorkSchedules      w ON w.work_schedule_id = e.employee_work_schedule_id
  WHERE e.employee_code LIKE 'DEMO-%'
    AND w.work_schedule_name <> 'Kötetlen'
    AND COALESCE(e.employee_core_start, c.core_hour_start) IS NOT NULL
)
SELECT d.employee_id,
       n.nap,
       TIMESTAMP(n.nap, d.kezdes),
       TIMESTAMP(n.nap, d.kezdes)
         + INTERVAL (8 + IF((DAY(n.nap) + d.sorszam) % 11 = 0, 2, 0)) HOUR,
       TIMESTAMP(n.nap, d.kezdes) + INTERVAL 4 HOUR,
       TIMESTAMP(n.nap, d.kezdes) + INTERVAL 4 HOUR + INTERVAL 30 MINUTE,
       IF((DAY(n.nap) + d.sorszam) % 11 = 0, 1, 0),
       'Demo adat'
FROM naptar n
CROSS JOIN dolgozo d
WHERE DAYOFWEEK(n.nap) NOT IN (1, 7)
  AND NOT EXISTS (
        SELECT 1 FROM GlobalCalendar g
        WHERE g.gl_cal_date = n.nap
          AND g.gl_cal_day_type IN ('Munkaszüneti nap', 'Pihenőnap')
      )
  AND NOT EXISTS (
        SELECT 1 FROM Requests r
        WHERE r.request_employee_id = d.employee_id
          AND r.request_status = 'Jóváhagyva'
          AND n.nap BETWEEN r.request_start_date AND r.request_end_date
      );

INSERT INTO WorkingTimeTracking (
  wtt_employee_id, wtt_working_date,
  wtt_working_start, wtt_working_end,
  wtt_is_ordered, wtt_note
)
SELECT e.employee_id, v.nap,
       TIMESTAMP(v.nap, v.kezdes),
       TIMESTAMP(v.nap, v.kezdes) + INTERVAL v.orak HOUR,
       1, 'Demo adat, elrendelt hetvegi munka'
FROM (
            SELECT 'DEMO-001' AS kod, '2026-08-08' AS nap, '06:00:00' AS kezdes, 8 AS orak
  UNION ALL SELECT 'DEMO-002', '2026-08-08', '06:00:00', 6
  UNION ALL SELECT 'DEMO-011', '2026-08-22', '22:00:00', 8
  UNION ALL SELECT 'DEMO-012', '2026-08-22', '22:00:00', 8
  UNION ALL SELECT 'DEMO-016', '2026-09-12', '06:00:00', 8
  UNION ALL SELECT 'DEMO-017', '2026-09-12', '06:00:00', 4
  UNION ALL SELECT 'DEMO-021', '2026-09-26', '06:00:00', 8
  UNION ALL SELECT 'DEMO-006', '2026-10-10', '14:00:00', 8
  UNION ALL SELECT 'DEMO-013', '2026-10-17', '22:00:00', 8
  UNION ALL SELECT 'DEMO-022', '2026-10-24', '06:00:00', 6
) v
JOIN Employees e ON e.employee_code = v.kod
WHERE NOT EXISTS (
  SELECT 1 FROM WorkingTimeTracking w
  WHERE w.wtt_employee_id = e.employee_id AND w.wtt_working_date = v.nap
);

SET SQL_SAFE_UPDATES = @elozo_safe_updates;

SELECT DATE_FORMAT(w.wtt_working_date, '%Y-%m') AS honap,
       COUNT(*)                                 AS rogzitett_nap,
       COUNT(DISTINCT w.wtt_employee_id)        AS dolgozo,
       SUM(w.wtt_is_ordered)                    AS elrendelt_nap
FROM WorkingTimeTracking w
JOIN Employees e ON e.employee_id = w.wtt_employee_id
WHERE e.employee_code LIKE 'DEMO-%'
GROUP BY DATE_FORMAT(w.wtt_working_date, '%Y-%m')
ORDER BY honap;

SELECT a.absence_name AS jogcim, COUNT(*) AS kerelem
FROM Requests r
JOIN Absences  a ON a.absence_id = r.request_absence_id
JOIN Employees e ON e.employee_id = r.request_employee_id
WHERE e.employee_code LIKE 'DEMO-%'
GROUP BY a.absence_name
ORDER BY a.absence_name;
