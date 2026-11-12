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
  permission_key, permission_name, permission_is_group, permission_sort
)
SELECT v.kulcs, v.nev, v.csoport, v.sorrend FROM (
            SELECT 'dashboard'    AS kulcs, 'Áttekintő'                 AS nev,
                   0 AS csoport, 10 AS sorrend
  UNION ALL SELECT 'time_log',     'Munkaidő rögzítése',      1,  20
  UNION ALL SELECT 'requests',     'Kérelmek és elrendelések',1,  30
  UNION ALL SELECT 'reports',      'Riport és bérfeladás',    1,  40
  UNION ALL SELECT 'employees',    'Dolgozók és fiókok',      1,  50
  UNION ALL SELECT 'organisation', 'Szervezet és csoportok',  0,  60
  UNION ALL SELECT 'master_data',  'Törzsadatok',             1,  70
  UNION ALL SELECT 'calendar',     'Központi naptár',         0,  80
  UNION ALL SELECT 'company',      'Vállalati adatok',        1,  90
  UNION ALL SELECT 'permissions',  'Jogosultságok',           0, 100
) v
WHERE NOT EXISTS (
  SELECT 1 FROM Permissions p WHERE p.permission_key = v.kulcs
);

INSERT INTO Permissions (
  permission_key, permission_name, permission_parent_id,
  permission_is_group, permission_sort
)
SELECT v.kulcs, v.nev, szulo.permission_id, 0, v.sorrend
FROM (
            SELECT 'time_log.own'   AS kulcs, 'Egyéni'      AS nev,
                   'time_log'       AS szulo_kulcs, 21 AS sorrend
  UNION ALL SELECT 'time_log.group',             'Csoportos',
                   'time_log',    22
  UNION ALL SELECT 'requests.own',               'Kérelmeim',
                   'requests',    31
  UNION ALL SELECT 'requests.approval',          'Elbírálás',
                   'requests',    32
  UNION ALL SELECT 'requests.ordered',           'Elrendelés',
                   'requests',    33
  UNION ALL SELECT 'reports.employees',          'Dolgozói bontás',
                   'reports',     41
  UNION ALL SELECT 'reports.statistics',         'Statisztika',
                   'reports',     42
  UNION ALL SELECT 'employees.list',             'Dolgozók',
                   'employees',   51
  UNION ALL SELECT 'employees.accounts',         'Fiókok',
                   'employees',   52
  UNION ALL SELECT 'master_data.payroll_codes',  'Bérkódok',
                   'master_data', 71
  UNION ALL SELECT 'master_data.work_schedules', 'Munkarendek',
                   'master_data', 72
  UNION ALL SELECT 'master_data.working_hours',  'Napi munkaidők',
                   'master_data', 73
  UNION ALL SELECT 'master_data.core_hours',     'Törzsidők',
                   'master_data', 74
  UNION ALL SELECT 'master_data.cost_centers',   'Költséghelyek',
                   'master_data', 75
  UNION ALL SELECT 'master_data.absences',       'Távolléti jogcímek',
                   'master_data', 76
  UNION ALL SELECT 'master_data.allowances',     'Pótlékok',
                   'master_data', 77
  UNION ALL SELECT 'company.settings',           'Cégadatok',
                   'company',     91
  UNION ALL SELECT 'company.locations',          'Telephelyek',
                   'company',     92
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
  'dashboard', 'time_log.own', 'requests.own'
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
  'dashboard',
  'time_log.own', 'time_log.group',
  'requests.own', 'requests.approval', 'requests.ordered',
  'reports.employees', 'reports.statistics'
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
  'dashboard',
  'time_log.own', 'time_log.group',
  'requests.own', 'requests.approval',
  'reports.employees', 'reports.statistics',
  'employees.list', 'employees.accounts',
  'organisation', 'calendar',
  'company.settings', 'company.locations'
)
WHERE r.user_role_name = 'HR-Bér'
  AND NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.user_role_id = r.user_role_id
      AND rp.permission_id = p.permission_id
  );
