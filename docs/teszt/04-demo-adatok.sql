USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

SET @ho_eleje := '2026-10-01';
SET @ho_vege  := '2026-10-31';

UPDATE Employees
SET employee_work_schedule_id =
      (SELECT work_schedule_id FROM WorkSchedules WHERE work_schedule_name = 'Műszakos'),
    employee_working_hour_id =
      (SELECT working_hour_id FROM WorkingHours WHERE working_hour_num = 8),
    employee_break_minutes = 30,
    employee_break_paid = 0,
    employee_annual_leave_days = 25
WHERE employee_code IN ('TESZT-D1', 'TESZT-D2', 'TESZT-D3');

UPDATE Employees
SET employee_core_hour_id =
      (SELECT core_hour_id FROM CoreHours WHERE core_hour_name = '06:00-14:00'),
    employee_break_start = '10:00:00',
    employee_break_end   = '10:30:00'
WHERE employee_code IN ('TESZT-D1', 'TESZT-D2');

UPDATE Employees
SET employee_core_hour_id =
      (SELECT core_hour_id FROM CoreHours WHERE core_hour_name = '14:00-22:00'),
    employee_break_start = '18:00:00',
    employee_break_end   = '18:30:00'
WHERE employee_code = 'TESZT-D3';

UPDATE Employees
SET employee_category_id =
      (SELECT employee_category_id FROM EmployeeCategories
        WHERE employee_category_name = 'Fizikai')
WHERE employee_code IN ('TESZT-D1', 'TESZT-D2', 'TESZT-D3', 'TESZT-DM1');

UPDATE Employees SET employee_gender = 'Férfi', employee_birth_date = '1996-03-11'
WHERE employee_code = 'TESZT-D1';

UPDATE Employees SET employee_gender = 'Nő', employee_birth_date = '1988-07-22'
WHERE employee_code = 'TESZT-D2';

UPDATE Employees SET employee_gender = 'Férfi', employee_birth_date = '1979-01-30'
WHERE employee_code = 'TESZT-D3';

UPDATE Employees SET employee_gender = 'Férfi', employee_birth_date = '1992-11-05'
WHERE employee_code = 'TESZT-DM1';

UPDATE Employees SET employee_gender = 'Nő', employee_birth_date = '1984-05-17'
WHERE employee_code = 'TESZT-DN1';

UPDATE Employees SET employee_gender = 'Férfi', employee_birth_date = '1975-09-02'
WHERE employee_code = 'TESZT-VM1';

UPDATE Employees SET employee_gender = 'Nő', employee_birth_date = '1998-12-14'
WHERE employee_code = 'TESZT-VN1';

DELETE FROM WorkingTimeTracking
WHERE wtt_working_date BETWEEN @ho_eleje AND @ho_vege
  AND wtt_employee_id IN (
        SELECT employee_id FROM Employees WHERE employee_code LIKE 'TESZT-%'
      );

DELETE FROM Requests
WHERE request_start_date BETWEEN @ho_eleje AND @ho_vege
  AND request_employee_id IN (
        SELECT employee_id FROM Employees WHERE employee_code LIKE 'TESZT-%'
      );

INSERT INTO Requests (
  request_employee_id, request_absence_id,
  request_start_date, request_end_date,
  request_status, request_message,
  request_decision_by, request_decision_at
)
SELECT e.employee_id, a.absence_id, v.kezdet, v.veg, 'Jóváhagyva', v.indok,
       (SELECT user_id FROM Users WHERE user_username = 'teszt.vezeto.m'),
       NOW()
FROM (
            SELECT 'TESZT-D1'  AS kod, 'Fizetett szabadság' AS jogcim,
                   '2026-10-06' AS kezdet, '2026-10-08' AS veg,
                   'Demo adat'  AS indok
  UNION ALL SELECT 'TESZT-D2',  'Betegség',                 '2026-10-13', '2026-10-14', 'Demo adat'
  UNION ALL SELECT 'TESZT-D3',  'Fizetett szabadság',       '2026-10-20', '2026-10-21', 'Demo adat'
  UNION ALL SELECT 'TESZT-DM1', 'Igazolt fizetett távollét','2026-10-09', '2026-10-09', 'Demo adat'
  UNION ALL SELECT 'TESZT-DN1', 'Fizetett szabadság',       '2026-10-26', '2026-10-28', 'Demo adat'
  UNION ALL SELECT 'TESZT-VN1', 'Betegség',                 '2026-10-15', '2026-10-16', 'Demo adat'
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
  SELECT @ho_eleje AS nap
  UNION ALL
  SELECT DATE_ADD(nap, INTERVAL 1 DAY) FROM naptar WHERE nap < @ho_vege
),
beosztas AS (
            SELECT 'TESZT-D1'  AS kod, '06:00:00' AS kezdes, 8 AS orak, 0 AS tulora
  UNION ALL SELECT 'TESZT-D2',  '06:00:00', 8, 0
  UNION ALL SELECT 'TESZT-D3',  '14:00:00', 8, 0
  UNION ALL SELECT 'TESZT-DM1', '22:00:00', 8, 0
  UNION ALL SELECT 'TESZT-DN1', '07:00:00', 8, 0
  UNION ALL SELECT 'TESZT-VM1', '22:00:00', 8, 0
  UNION ALL SELECT 'TESZT-VN1', '07:00:00', 8, 0
)
SELECT e.employee_id,
       n.nap,
       TIMESTAMP(n.nap, b.kezdes),
       TIMESTAMP(n.nap, b.kezdes)
         + INTERVAL (b.orak + IF(DAY(n.nap) % 7 = 3 AND b.kod IN ('TESZT-D1','TESZT-DN1'), 2, 0)) HOUR,
       TIMESTAMP(n.nap, b.kezdes) + INTERVAL 4 HOUR,
       TIMESTAMP(n.nap, b.kezdes) + INTERVAL 4 HOUR + INTERVAL 30 MINUTE,
       IF(DAY(n.nap) % 7 = 3 AND b.kod IN ('TESZT-D1','TESZT-DN1'), 1, 0),
       'Demo adat'
FROM naptar n
CROSS JOIN beosztas b
JOIN Employees e ON e.employee_code = b.kod
WHERE DAYOFWEEK(n.nap) NOT IN (1, 7)
  AND NOT EXISTS (
        SELECT 1 FROM GlobalCalendar g
        WHERE g.gl_cal_date = n.nap
          AND g.gl_cal_day_type IN ('Munkaszüneti nap', 'Pihenőnap')
      )
  AND NOT EXISTS (
        SELECT 1 FROM Requests r
        WHERE r.request_employee_id = e.employee_id
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
            SELECT 'TESZT-D1'  AS kod, '2026-10-10' AS nap, '06:00:00' AS kezdes, 8 AS orak
  UNION ALL SELECT 'TESZT-D2',  '2026-10-10', '06:00:00', 6
  UNION ALL SELECT 'TESZT-DM1', '2026-10-17', '22:00:00', 8
  UNION ALL SELECT 'TESZT-D3',  '2026-10-24', '14:00:00', 8
) v
JOIN Employees e ON e.employee_code = v.kod;

SET SQL_SAFE_UPDATES = @elozo_safe_updates;

SELECT e.employee_code                     AS dolgozo,
       COUNT(w.wtt_id)                     AS rogzitett_nap,
       SUM(w.wtt_is_ordered)               AS elrendelt_nap
FROM Employees e
LEFT JOIN WorkingTimeTracking w
       ON w.wtt_employee_id = e.employee_id
      AND w.wtt_working_date BETWEEN @ho_eleje AND @ho_vege
WHERE e.employee_code LIKE 'TESZT-%'
GROUP BY e.employee_code
ORDER BY e.employee_code;

SELECT a.absence_name AS jogcim, COUNT(*) AS kerelem
FROM Requests r
JOIN Absences a ON a.absence_id = r.request_absence_id
WHERE r.request_start_date BETWEEN @ho_eleje AND @ho_vege
GROUP BY a.absence_name
ORDER BY a.absence_name;
