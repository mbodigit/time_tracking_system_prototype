USE time_tracking_db_prototype;

SET NAMES utf8mb4;

INSERT INTO UserRoles (user_role_name)
SELECT v.nev FROM (
            SELECT 'Admin'    AS nev
  UNION ALL SELECT 'Vezető'
  UNION ALL SELECT 'HR-Bér'
  UNION ALL SELECT 'Dolgozó'
) v
WHERE NOT EXISTS (
  SELECT 1 FROM UserRoles r WHERE r.user_role_name = v.nev
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
  UNION ALL SELECT 'admin.org_structure',    'Terület, részleg és műszak kezelése',
                   'admin', '/admin-org-structure', 65
  UNION ALL SELECT 'admin.working_time',     'Munkarendek és munkaidők kezelése',
                   'admin', '/admin-working-time', 66
  UNION ALL SELECT 'admin.absences',         'Távolléti jogcímek kezelése',
                   'admin', '/admin-absences',     67
  UNION ALL SELECT 'admin.calendar',         'Központi naptár kezelése',
                   'admin', '/admin-calendar',     68
  UNION ALL SELECT 'admin.cost_centers',     'Költséghelyek kezelése',
                   'admin', '/admin-cost-centers', 70
  UNION ALL SELECT 'admin.core_hours',       'Törzsidő-sablonok kezelése',
                   'admin', '/admin-core-hours',   72
  UNION ALL SELECT 'admin.structure.view',   'Szervezet és csoportok megtekintése',
                   'admin', '/admin-org-structure', 73
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
  'dashboard.view',
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
  'dashboard.view',
  'monthly_log.record', 'monthly_log.edit_past', 'monthly_log.export',
  'group_log.record', 'group_log.edit_past',
  'requests.submit', 'requests.approve',
  'reports.view', 'reports.export'
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
  'dashboard.view',
  'monthly_log.record', 'monthly_log.edit_past', 'monthly_log.export',
  'requests.submit', 'requests.approve',
  'reports.view', 'reports.export',
  'admin.employees', 'admin.users', 'admin.calendar',
  'admin.structure.view'
)
WHERE r.user_role_name = 'HR-Bér'
  AND NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.user_role_id = r.user_role_id
      AND rp.permission_id = p.permission_id
  );
