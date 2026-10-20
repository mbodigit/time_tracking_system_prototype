USE time_tracking_db_prototype;

SET NAMES utf8mb4;

SET @elozo_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

INSERT INTO RolePermissions (user_role_id, permission_id)
SELECT r.user_role_id, p.permission_id
FROM UserRoles r
JOIN Permissions p ON p.permission_key = 'reports.export'
WHERE r.user_role_name = 'Vezető'
  AND NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.user_role_id = r.user_role_id
      AND rp.permission_id = p.permission_id
  );

SET SQL_SAFE_UPDATES = @elozo_safe_updates;

SELECT r.user_role_name AS szerepkor, p.permission_key AS jogosultsag
FROM RolePermissions rp
JOIN UserRoles r  ON r.user_role_id  = rp.user_role_id
JOIN Permissions p ON p.permission_id = rp.permission_id
WHERE p.permission_key LIKE 'reports.%'
ORDER BY r.user_role_name, p.permission_key;