USE time_tracking_db_prototype;

SET NAMES utf8mb4;

INSERT INTO Permissions (
  permission_key, permission_name, permission_parent_id,
  permission_is_group, permission_route, permission_sort
)
SELECT 'admin.structure.view', 'Szervezet és csoportok megtekintése',
       p.permission_id, 0, '/admin-org-structure', 73
FROM Permissions p
WHERE p.permission_key = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM Permissions x WHERE x.permission_key = 'admin.structure.view'
  );

INSERT INTO RolePermissions (user_role_id, permission_id)
SELECT r.user_role_id, p.permission_id
FROM UserRoles r
JOIN Permissions p ON p.permission_key = 'admin.structure.view'
WHERE r.user_role_name IN ('Admin', 'HR-Bér')
  AND NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.user_role_id = r.user_role_id
      AND rp.permission_id = p.permission_id
  );

SELECT r.user_role_name AS szerepkor, p.permission_key AS jogosultsag
FROM RolePermissions rp
JOIN UserRoles   r ON r.user_role_id  = rp.user_role_id
JOIN Permissions p ON p.permission_id = rp.permission_id
WHERE p.permission_key = 'admin.structure.view'
ORDER BY r.user_role_name;