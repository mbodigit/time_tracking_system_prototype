USE time_tracking_db_prototype;

SET NAMES utf8mb4;

INSERT INTO Absences (
  absence_name, absence_payroll_code, absence_is_paid, absence_category,
  absence_is_open_ended, absence_rec_type, absence_needs_approval,
  absence_status, absence_sort
)
SELECT v.nev, v.berkod, v.fizetett, v.kategoria, v.nyitott, v.rogzites,
       IF(v.nev = 'Betegség', 0, 1), 1, v.sorrend
FROM (
            SELECT 'Fizetett szabadság'            AS nev, 'SZAB'    AS berkod,
                   1 AS fizetett, 'Szabadság'      AS kategoria,
                   0 AS nyitott, 0 AS rogzites, 10 AS sorrend
  UNION ALL SELECT 'Betegség',                     'BETEG',   1, 'Betegség',    1, 0,  20
  UNION ALL SELECT 'Igazolt fizetett távollét',    'IFT',     1, 'Egyéb',       0, 0,  30
  UNION ALL SELECT 'Igazolt nem fizetett távollét','INFT',    0, 'Egyéb',       0, 0,  40
  UNION ALL SELECT 'Igazolatlan távollét',         'IGTLAN',  0, 'Egyéb',       0, 0,  50
  UNION ALL SELECT 'Fizetés nélküli szabadság',    'FNSZ',    0, 'Szabadság',   0, 0,  60
  UNION ALL SELECT 'Hozzátartozó halála',          'GYASZ',   1, 'Egyéb',       0, 0,  70
  UNION ALL SELECT 'Apanap',                       'APANAP',  1, 'Szabadság',   0, 0,  80
  UNION ALL SELECT 'Felmentési idő',               'FELMENT', 1, 'Egyéb',       0, 0,  90
  UNION ALL SELECT 'Fizetett nap',                 'FIZNAP',  1, 'Egyéb',       0, 0, 100
  UNION ALL SELECT 'Ünnepnap',                     'UNNEP',   1, 'Egyéb',       0, 0, 110
  UNION ALL SELECT 'Pihenőnap',                    'PIHENO',  1, 'Egyéb',       0, 0, 120
  UNION ALL SELECT 'Külföldi kiküldetés',          'KIKULD',  1, 'Munkavégzés', 0, 0, 150
  UNION ALL SELECT 'Tanulmányi szabadság',         'TANSZAB', 1, 'Szabadság',   0, 0, 160
) v
WHERE NOT EXISTS (
  SELECT 1 FROM Absences a WHERE a.absence_name = v.nev
);

INSERT INTO AbsenceWorkSchedules (absence_id, work_schedule_id)
SELECT a.absence_id, w.work_schedule_id
FROM Absences a
CROSS JOIN WorkSchedules w
WHERE NOT EXISTS (
    SELECT 1 FROM AbsenceWorkSchedules x
    WHERE x.absence_id = a.absence_id
      AND x.work_schedule_id = w.work_schedule_id
  );

INSERT INTO Allowances (
  allowance_name, allowance_code, allowance_payroll_code,
  allowance_percent, allowance_start_hour, allowance_end_hour
)
SELECT v.nev, v.kod, v.berkod, v.szazalek, v.kezd, v.veg FROM (
            SELECT 'Műszakpótlék' AS nev, 'muszak' AS kod,
                   'POT30' AS berkod, 30.00 AS szazalek,
                   '18:00:00' AS kezd, '06:00:00' AS veg
  UNION ALL SELECT 'Hétköznapi túlóra',        'tulora',       'TUL50',     50.00,
                   '00:00:00', '00:00:00'
  UNION ALL SELECT 'Szombati túlóra',          'szombat',      'TUL100SZ', 100.00,
                   '00:00:00', '00:00:00'
  UNION ALL SELECT 'Vasárnapi túlóra',         'vasarnap',     'TUL200VA', 200.00,
                   '00:00:00', '00:00:00'
  UNION ALL SELECT 'Pihenőnapi túlóra',        'pihenonap',    'TUL100PN', 100.00,
                   '00:00:00', '00:00:00'
  UNION ALL SELECT 'Munkaszüneti napi túlóra', 'munkaszuneti', 'TUL200MU', 200.00,
                   '00:00:00', '00:00:00'
) v
WHERE NOT EXISTS (
  SELECT 1 FROM Allowances p WHERE p.allowance_name = v.nev
);

INSERT INTO WorkScheduleAllowances (work_schedule_id, allowance_id)
SELECT w.work_schedule_id, p.allowance_id
FROM WorkSchedules w
CROSS JOIN Allowances p
WHERE (
        p.allowance_name <> 'Műszakpótlék'
        OR w.work_schedule_is_shift = 1
      )
  AND NOT EXISTS (
    SELECT 1 FROM WorkScheduleAllowances x
    WHERE x.work_schedule_id = w.work_schedule_id
      AND x.allowance_id = p.allowance_id
  );
