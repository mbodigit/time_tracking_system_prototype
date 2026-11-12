USE time_tracking_db_prototype;

SET NAMES utf8mb4;

INSERT INTO PayrollCodes (payroll_code, payroll_code_name, payroll_code_is_base)
SELECT v.kod, v.nev, v.alap FROM (
            SELECT 'ALAP'     AS kod, 'Ledolgozott órák'            AS nev, 1 AS alap
  UNION ALL SELECT 'SZAB',    'Fizetett szabadság',                      0
  UNION ALL SELECT 'BETEG',   'Betegség',                                0
  UNION ALL SELECT 'IFT',     'Igazolt fizetett távollét',               0
  UNION ALL SELECT 'INFT',    'Igazolt nem fizetett távollét',           0
  UNION ALL SELECT 'IGTLAN',  'Igazolatlan távollét',                    0
  UNION ALL SELECT 'FNSZ',    'Fizetés nélküli szabadság',               0
  UNION ALL SELECT 'GYASZ',   'Hozzátartozó halála',                     0
  UNION ALL SELECT 'APANAP',  'Apanap',                                  0
  UNION ALL SELECT 'FELMENT', 'Felmentési idő',                          0
  UNION ALL SELECT 'FIZNAP',  'Fizetett nap',                            0
  UNION ALL SELECT 'UNNEP',   'Ünnepnap',                                0
  UNION ALL SELECT 'PIHENO',  'Pihenőnap',                               0
  UNION ALL SELECT 'KIKULD',  'Külföldi kiküldetés',                     0
  UNION ALL SELECT 'TANSZAB', 'Tanulmányi szabadság',                    0
  UNION ALL SELECT 'POT30',   'Műszakpótlék',                            0
  UNION ALL SELECT 'TUL50',   'Hétköznapi túlóra',                       0
  UNION ALL SELECT 'TUL100SZ','Szombati túlóra',                         0
  UNION ALL SELECT 'TUL200VA','Vasárnapi túlóra',                        0
  UNION ALL SELECT 'TUL100PN','Pihenőnapi túlóra',                       0
  UNION ALL SELECT 'TUL200MU','Munkaszüneti napi túlóra',                0
) v
WHERE NOT EXISTS (
  SELECT 1 FROM PayrollCodes p WHERE p.payroll_code = v.kod
);

INSERT INTO Absences (
  absence_name, absence_payroll_code_id, absence_is_paid,
  absence_is_open_ended, absence_needs_approval,
  absence_status, absence_sort
)
SELECT v.nev, pc.payroll_code_id, v.fizetett, v.nyitott,
       IF(v.nev = 'Betegség', 0, 1), 1, v.sorrend
FROM (
            SELECT 'Fizetett szabadság' AS nev, 'SZAB' AS berkod,
                   1 AS fizetett, 0 AS nyitott, 10 AS sorrend
  UNION ALL SELECT 'Betegség',                      'BETEG',    1, 1,  20
  UNION ALL SELECT 'Igazolt fizetett távollét',     'IFT',      1, 0,  30
  UNION ALL SELECT 'Igazolt nem fizetett távollét', 'INFT',     0, 0,  40
  UNION ALL SELECT 'Igazolatlan távollét',          'IGTLAN',   0, 0,  50
  UNION ALL SELECT 'Fizetés nélküli szabadság',     'FNSZ',     0, 0,  60
  UNION ALL SELECT 'Hozzátartozó halála',           'GYASZ',    1, 0,  70
  UNION ALL SELECT 'Apanap',                        'APANAP',   1, 0,  80
  UNION ALL SELECT 'Felmentési idő',                'FELMENT',  1, 0,  90
  UNION ALL SELECT 'Fizetett nap',                  'FIZNAP',   1, 0, 100
  UNION ALL SELECT 'Ünnepnap',                      'UNNEP',    1, 0, 110
  UNION ALL SELECT 'Pihenőnap',                     'PIHENO',   1, 0, 120
  UNION ALL SELECT 'Külföldi kiküldetés',           'KIKULD',   1, 0, 150
  UNION ALL SELECT 'Tanulmányi szabadság',          'TANSZAB',  1, 0, 160
) v
JOIN PayrollCodes pc ON pc.payroll_code = v.berkod
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
  allowance_name, allowance_code, allowance_payroll_code_id,
  allowance_percent, allowance_start_hour, allowance_end_hour
)
SELECT v.nev, v.kod, pc.payroll_code_id, v.szazalek, v.kezd, v.veg FROM (
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
JOIN PayrollCodes pc ON pc.payroll_code = v.berkod
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
