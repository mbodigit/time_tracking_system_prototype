USE time_tracking_db_prototype;

SET NAMES utf8mb4;

INSERT INTO EmployeeStatus (employee_status_name, employee_status_is_active)
SELECT v.nev, v.aktiv FROM (
            SELECT 'Aktív'                             AS nev, 1 AS aktiv
  UNION ALL SELECT 'Felmondással aktív',                    1
  UNION ALL SELECT 'Felmondással felmentve',                1
  UNION ALL SELECT 'Tartós távollét (csed/gyed/gyes)',      1
  UNION ALL SELECT 'Fizetés nélküli tartós távollét',       1
  UNION ALL SELECT 'Betegség miatti tartós távollét',       1
  UNION ALL SELECT 'Kilépett',                              0
  UNION ALL SELECT 'Elhunyt',                               0
) v
WHERE NOT EXISTS (
  SELECT 1 FROM EmployeeStatus s WHERE s.employee_status_name = v.nev
);

INSERT INTO EmployeeCategories (employee_category_name)
SELECT v.nev FROM (
            SELECT 'Szellemi' AS nev
  UNION ALL SELECT 'Fizikai'
) v
WHERE NOT EXISTS (
  SELECT 1 FROM EmployeeCategories c WHERE c.employee_category_name = v.nev
);

INSERT INTO WorkSchedules (work_schedule_name, work_schedule_is_shift)
SELECT v.nev, v.muszakos FROM (
            SELECT 'Műszakos'     AS nev, 1 AS muszakos
  UNION ALL SELECT 'Nem műszakos',      0
  UNION ALL SELECT 'Kötetlen',          0
) v
WHERE NOT EXISTS (
  SELECT 1 FROM WorkSchedules w WHERE w.work_schedule_name = v.nev
);

INSERT INTO WorkingHours (working_hour_num, working_hour_name)
SELECT v.ora, v.nev FROM (
            SELECT 4 AS ora, '4 órás' AS nev
  UNION ALL SELECT 6,        '6 órás'
  UNION ALL SELECT 7,        '7 órás'
  UNION ALL SELECT 8,        '8 órás'
) v
WHERE NOT EXISTS (
  SELECT 1 FROM WorkingHours h WHERE h.working_hour_num = v.ora
);

INSERT INTO CoreHours (core_hour_name, core_hour_start, core_hour_end)
SELECT v.nev, v.kezd, v.veg FROM (
            SELECT '06:00-14:00' AS nev, '06:00:00' AS kezd, '14:00:00' AS veg
  UNION ALL SELECT '07:00-15:00',        '07:00:00',         '15:00:00'
  UNION ALL SELECT '14:00-22:00',        '14:00:00',         '22:00:00'
  UNION ALL SELECT '22:00-06:00',        '22:00:00',         '06:00:00'
) v
WHERE NOT EXISTS (
  SELECT 1 FROM CoreHours c WHERE c.core_hour_name = v.nev
);

INSERT INTO Absences (
  absence_name, absence_is_paid, absence_category,
  absence_is_open_ended, absence_rec_type, absence_status, absence_sort
)
SELECT v.nev, v.fizetett, v.kategoria, v.nyitott, v.rogzites, 1, v.sorrend FROM (
            SELECT 'Fizetett szabadság'            AS nev, 1 AS fizetett,
                   'Szabadság'                     AS kategoria,
                   0 AS nyitott, 0 AS rogzites, 10 AS sorrend
  UNION ALL SELECT 'Betegség',                     1, 'Betegség',       1, 0,  20
  UNION ALL SELECT 'Igazolt fizetett távollét',    1, 'Egyéb',          0, 0,  30
  UNION ALL SELECT 'Igazolt nem fizetett távollét',0, 'Egyéb',          0, 0,  40
  UNION ALL SELECT 'Igazolatlan távollét',         0, 'Egyéb',          0, 0,  50
  UNION ALL SELECT 'Fizetés nélküli szabadság',    0, 'Szabadság',      0, 0,  60
  UNION ALL SELECT 'Hozzátartozó halála',          1, 'Egyéb',          0, 0,  70
  UNION ALL SELECT 'Apanap',                       1, 'Szabadság',      0, 0,  80
  UNION ALL SELECT 'Felmentési idő',               1, 'Egyéb',          0, 0,  90
  UNION ALL SELECT 'Fizetett nap',                 1, 'Egyéb',          0, 0, 100
  UNION ALL SELECT 'Ünnepnap',                     1, 'Egyéb',          0, 0, 110
  UNION ALL SELECT 'Pihenőnap',                    1, 'Egyéb',          0, 0, 120
  UNION ALL SELECT 'Homeoffice',                   1, 'Munkavégzés',    0, 1, 130
  UNION ALL SELECT 'Csúszó nap',                   1, 'Szabadság',      0, 0, 140
  UNION ALL SELECT 'Külföldi kiküldetés',          1, 'Munkavégzés',    0, 0, 150
  UNION ALL SELECT 'Tanulmányi szabadság',         1, 'Szabadság',      0, 0, 160
) v
WHERE NOT EXISTS (
  SELECT 1 FROM Absences a WHERE a.absence_name = v.nev
);

INSERT INTO AbsenceWorkSchedules (absence_id, work_schedule_id)
SELECT a.absence_id, w.work_schedule_id
FROM Absences a
CROSS JOIN WorkSchedules w
WHERE (
        a.absence_name NOT IN ('Homeoffice', 'Csúszó nap',
                               'Külföldi kiküldetés', 'Tanulmányi szabadság')
        OR (w.work_schedule_name = 'Nem műszakos')
        OR (w.work_schedule_name = 'Kötetlen'
            AND a.absence_name IN ('Külföldi kiküldetés', 'Tanulmányi szabadság'))
      )
  AND NOT EXISTS (
    SELECT 1 FROM AbsenceWorkSchedules x
    WHERE x.absence_id = a.absence_id
      AND x.work_schedule_id = w.work_schedule_id
  );

INSERT INTO Allowances (
  allowance_name, allowance_percent, allowance_start_hour, allowance_end_hour
)
SELECT v.nev, v.szazalek, v.kezd, v.veg FROM (
            SELECT 'Délutáni műszakpótlék' AS nev,  15.00 AS szazalek,
                   '18:00:00' AS kezd, '22:00:00' AS veg
  UNION ALL SELECT 'Éjszakai műszakpótlék',        30.00, '22:00:00', '06:00:00'
  UNION ALL SELECT 'Hétköznapi túlóra',            50.00, '00:00:00', '00:00:00'
  UNION ALL SELECT 'Szombati túlóra',             100.00, '00:00:00', '00:00:00'
  UNION ALL SELECT 'Vasárnapi túlóra',            200.00, '00:00:00', '00:00:00'
  UNION ALL SELECT 'Pihenőnapi túlóra',           100.00, '00:00:00', '00:00:00'
  UNION ALL SELECT 'Munkaszüneti napi túlóra',    200.00, '00:00:00', '00:00:00'
) v
WHERE NOT EXISTS (
  SELECT 1 FROM Allowances p WHERE p.allowance_name = v.nev
);

INSERT INTO WorkScheduleAllowances (work_schedule_id, allowance_id)
SELECT w.work_schedule_id, p.allowance_id
FROM WorkSchedules w
CROSS JOIN Allowances p
WHERE (
        p.allowance_name NOT IN ('Délutáni műszakpótlék', 'Éjszakai műszakpótlék')
        OR w.work_schedule_is_shift = 1
      )
  AND NOT EXISTS (
    SELECT 1 FROM WorkScheduleAllowances x
    WHERE x.work_schedule_id = w.work_schedule_id
      AND x.allowance_id = p.allowance_id
  );

INSERT INTO Permissions (
  permission_key, permission_name, permission_is_group,
  permission_route, permission_sort
)
SELECT v.kulcs, v.nev, 1, v.utvonal, v.sorrend FROM (
            SELECT 'dashboard'   AS kulcs, 'Áttekintés'              AS nev,
                   '/dashboard'  AS utvonal, 10 AS sorrend
  UNION ALL SELECT 'monthly_log',       'Munkaidő rögzítése',
                   '/monthly-log',       20
  UNION ALL SELECT 'group_log',         'Csoportos napi rögzítés',
                   '/group-log',         30
  UNION ALL SELECT 'requests',          'Kérelmek és igénylések',
                   '/requests',          40
  UNION ALL SELECT 'reports',           'Riportok',
                   '/reports',           50
  UNION ALL SELECT 'admin',             'Adminisztráció',
                   '/admin',             60
) v
WHERE NOT EXISTS (
  SELECT 1 FROM Permissions p WHERE p.permission_key = v.kulcs
);

INSERT INTO Permissions (
  permission_key, permission_name, permission_parent_id,
  permission_is_group, permission_route, permission_sort
)
SELECT v.kulcs, v.nev, szulo.permission_id, 0, v.utvonal, v.sorrend
FROM (
            SELECT 'dashboard.view'         AS kulcs,
                   'Saját áttekintő megtekintése' AS nev,
                   'dashboard'              AS szulo_kulcs,
                   NULL                     AS utvonal, 11 AS sorrend
  UNION ALL SELECT 'dashboard.company_info', 'Vállalati információk megtekintése',
                   'dashboard',   NULL, 12
  UNION ALL SELECT 'monthly_log.record',     'Saját munkaidő rögzítése',
                   'monthly_log', NULL, 21
  UNION ALL SELECT 'monthly_log.edit_past',  'Visszamenőleges módosítás (max. 3 nap)',
                   'monthly_log', NULL, 22
  UNION ALL SELECT 'monthly_log.export',     'Havi összesítő nyomtatása',
                   'monthly_log', NULL, 23
  UNION ALL SELECT 'group_log.record',       'Csoport munkaidejének rögzítése',
                   'group_log',   NULL, 31
  UNION ALL SELECT 'group_log.edit_past',    'Csoport adatainak visszamenőleges javítása',
                   'group_log',   NULL, 32
  UNION ALL SELECT 'requests.submit',        'Kérelem leadása',
                   'requests',    NULL, 41
  UNION ALL SELECT 'requests.approve',       'Kérelem elbírálása',
                   'requests',    NULL, 42
  UNION ALL SELECT 'reports.view',           'Riportok megtekintése',
                   'reports',     NULL, 51
  UNION ALL SELECT 'reports.export',         'Bérfeladási CSV export',
                   'reports',     NULL, 52
  UNION ALL SELECT 'admin.employees',        'Munkavállalók kezelése',
                   'admin', '/admin-employees',    61
  UNION ALL SELECT 'admin.users',            'Felhasználói fiókok kezelése',
                   'admin', '/admin-users',        62
  UNION ALL SELECT 'admin.groups',           'Csoportok kezelése',
                   'admin', '/admin-groups',       63
  UNION ALL SELECT 'admin.roles',            'Szerepkörök és jogosultságok kezelése',
                   'admin', '/admin-roles',        64
  UNION ALL SELECT 'admin.org_structure',    'Terület, részleg és műszak kezelése',
                   'admin', '/admin-org-structure', 65
  UNION ALL SELECT 'admin.working_time',     'Munkarendek és munkaidők kezelése',
                   'admin', '/admin-working-time', 66
  UNION ALL SELECT 'admin.absences',         'Távolléti jogcímek kezelése',
                   'admin', '/admin-absences',     67
  UNION ALL SELECT 'admin.calendar',         'Központi naptár kezelése',
                   'admin', '/admin-calendar',     68
  UNION ALL SELECT 'admin.company',          'Cégadatok kezelése',
                   'admin', '/admin-company',      69
  UNION ALL SELECT 'admin.cost_centers',     'Költséghelyek kezelése',
                   'admin', '/admin-cost-centers', 70
  UNION ALL SELECT 'admin.work_locations',   'Telephelyek kezelése',
                   'admin', '/admin-work-locations', 71
  UNION ALL SELECT 'admin.core_hours',       'Törzsidő-sablonok kezelése',
                   'admin', '/admin-core-hours',   72
) v
JOIN Permissions szulo ON szulo.permission_key = v.szulo_kulcs
WHERE NOT EXISTS (
  SELECT 1 FROM Permissions p WHERE p.permission_key = v.kulcs
);

INSERT INTO RolePermissions (user_role_id, permission_id)
SELECT r.user_role_id, p.permission_id
FROM UserRoles r
CROSS JOIN Permissions p
WHERE r.user_role_name = 'Admin'
  AND p.permission_is_group = 0
  AND NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.user_role_id = r.user_role_id
      AND rp.permission_id = p.permission_id
  );

INSERT INTO RolePermissions (user_role_id, permission_id)
SELECT r.user_role_id, p.permission_id
FROM UserRoles r
JOIN Permissions p ON p.permission_key IN (
  'dashboard.view', 'dashboard.company_info',
  'monthly_log.record', 'monthly_log.export',
  'requests.submit'
)
WHERE r.user_role_name = 'Dolgozó'
  AND NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.user_role_id = r.user_role_id
      AND rp.permission_id = p.permission_id
  );

INSERT INTO RolePermissions (user_role_id, permission_id)
SELECT r.user_role_id, p.permission_id
FROM UserRoles r
JOIN Permissions p ON p.permission_key IN (
  'dashboard.view', 'dashboard.company_info',
  'monthly_log.record', 'monthly_log.edit_past', 'monthly_log.export',
  'group_log.record', 'group_log.edit_past',
  'requests.submit', 'requests.approve',
  'reports.view'
)
WHERE r.user_role_name = 'Vezető'
  AND NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.user_role_id = r.user_role_id
      AND rp.permission_id = p.permission_id
  );

INSERT INTO RolePermissions (user_role_id, permission_id)
SELECT r.user_role_id, p.permission_id
FROM UserRoles r
JOIN Permissions p ON p.permission_key IN (
  'dashboard.view', 'dashboard.company_info',
  'monthly_log.record', 'monthly_log.edit_past', 'monthly_log.export',
  'requests.submit', 'requests.approve',
  'reports.view', 'reports.export',
  'admin.employees', 'admin.users', 'admin.calendar'
)
WHERE r.user_role_name = 'HR-Bér'
  AND NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.user_role_id = r.user_role_id
      AND rp.permission_id = p.permission_id
  );

INSERT INTO GlobalCalendar (gl_cal_date, gl_cal_day_type, gl_cal_note)
SELECT v.datum, v.tipus, v.megjegyzes FROM (
            SELECT '2026-01-01' AS datum, 'Munkaszüneti nap' AS tipus,
                   'Újév'                                    AS megjegyzes
  UNION ALL SELECT '2026-03-15', 'Munkaszüneti nap', 'Az 1848-as forradalom ünnepe'
  UNION ALL SELECT '2026-04-03', 'Munkaszüneti nap', 'Nagypéntek'
  UNION ALL SELECT '2026-04-06', 'Munkaszüneti nap', 'Húsvéthétfő'
  UNION ALL SELECT '2026-05-01', 'Munkaszüneti nap', 'A munka ünnepe'
  UNION ALL SELECT '2026-05-25', 'Munkaszüneti nap', 'Pünkösdhétfő'
  UNION ALL SELECT '2026-08-20', 'Munkaszüneti nap', 'Az államalapítás ünnepe'
  UNION ALL SELECT '2026-10-23', 'Munkaszüneti nap', 'Az 1956-os forradalom ünnepe'
  UNION ALL SELECT '2026-11-01', 'Munkaszüneti nap', 'Mindenszentek'
  UNION ALL SELECT '2026-12-25', 'Munkaszüneti nap', 'Karácsony'
  UNION ALL SELECT '2026-12-26', 'Munkaszüneti nap', 'Karácsony másnapja'
) v
WHERE NOT EXISTS (
  SELECT 1 FROM GlobalCalendar g WHERE g.gl_cal_date = v.datum
);

INSERT INTO CompanySettings (company_settings_id)
SELECT 1
WHERE NOT EXISTS (
  SELECT 1 FROM CompanySettings WHERE company_settings_id = 1
);

SELECT 'EmployeeStatus'         AS tabla, COUNT(*) AS sorok FROM EmployeeStatus
UNION ALL SELECT 'EmployeeCategories',     COUNT(*) FROM EmployeeCategories
UNION ALL SELECT 'WorkSchedules',          COUNT(*) FROM WorkSchedules
UNION ALL SELECT 'WorkingHours',           COUNT(*) FROM WorkingHours
UNION ALL SELECT 'CoreHours',              COUNT(*) FROM CoreHours
UNION ALL SELECT 'Absences',               COUNT(*) FROM Absences
UNION ALL SELECT 'AbsenceWorkSchedules',   COUNT(*) FROM AbsenceWorkSchedules
UNION ALL SELECT 'Allowances',             COUNT(*) FROM Allowances
UNION ALL SELECT 'WorkScheduleAllowances', COUNT(*) FROM WorkScheduleAllowances
UNION ALL SELECT 'Permissions',            COUNT(*) FROM Permissions
UNION ALL SELECT 'RolePermissions',        COUNT(*) FROM RolePermissions
UNION ALL SELECT 'GlobalCalendar',         COUNT(*) FROM GlobalCalendar
UNION ALL SELECT 'CompanySettings',        COUNT(*) FROM CompanySettings
UNION ALL SELECT 'UserRoles',              COUNT(*) FROM UserRoles
UNION ALL SELECT 'CostCenters',            COUNT(*) FROM CostCenters
UNION ALL SELECT 'WorkLocations',          COUNT(*) FROM WorkLocations;

SELECT r.user_role_name AS szerepkor, COUNT(rp.permission_id) AS jogosultsagok
FROM UserRoles r
LEFT JOIN RolePermissions rp ON rp.user_role_id = r.user_role_id
GROUP BY r.user_role_id, r.user_role_name
ORDER BY jogosultsagok DESC;

SELECT a.absence_name AS jogcim,
       GROUP_CONCAT(w.work_schedule_name ORDER BY w.work_schedule_name
                    SEPARATOR ', ') AS munkarendek
FROM Absences a
JOIN AbsenceWorkSchedules aws ON aws.absence_id = a.absence_id
JOIN WorkSchedules w ON w.work_schedule_id = aws.work_schedule_id
GROUP BY a.absence_id, a.absence_name, a.absence_sort
ORDER BY a.absence_sort;
