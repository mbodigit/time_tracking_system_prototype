const pool = require('../config/db');

const ADMIN_ROLE = 'Admin';

const listPermissionTree = async () => {
    const [rows] = await pool.execute(
        `SELECT p.permission_id, p.permission_key, p.permission_name,
                p.permission_parent_id, p.permission_is_group, p.permission_sort,
                szulo.permission_key AS parent_key
         FROM Permissions p
         LEFT JOIN Permissions szulo ON szulo.permission_id = p.permission_parent_id
         ORDER BY p.permission_sort`
    );

    return rows.map((row) => ({
        id: row.permission_id,
        key: row.permission_key,
        name: row.permission_name,
        parentKey: row.parent_key,
        isGroup: Boolean(row.permission_is_group)
    }));
};

const listRoleKeys = async (role) => {
    if (role === ADMIN_ROLE) {
        const [rows] = await pool.execute(
            `SELECT permission_key FROM Permissions WHERE permission_is_group = 0`
        );

        return rows.map((row) => row.permission_key);
    }

    const [rows] = await pool.execute(
        `SELECT p.permission_key
         FROM RolePermissions rp
         JOIN Permissions p ON p.permission_id = rp.permission_id
         JOIN UserRoles   r ON r.user_role_id  = rp.user_role_id
         WHERE r.user_role_name = ?`,
        [role]
    );

    return rows.map((row) => row.permission_key);
};

const listMatrix = async () => {
    const [rows] = await pool.execute(
        `SELECT r.user_role_name, p.permission_key
         FROM RolePermissions rp
         JOIN Permissions p ON p.permission_id = rp.permission_id
         JOIN UserRoles   r ON r.user_role_id  = rp.user_role_id`
    );

    const matrix = {};

    for (const row of rows) {
        const keys = matrix[row.user_role_name] || [];
        keys.push(row.permission_key);
        matrix[row.user_role_name] = keys;
    }

    return matrix;
};

const setRolePermission = async (roleId, permissionId, granted) => {
    if (granted) {
        await pool.execute(
            `INSERT IGNORE INTO RolePermissions (user_role_id, permission_id)
             VALUES (?, ?)`,
            [roleId, permissionId]
        );

        return;
    }

    await pool.execute(
        `DELETE FROM RolePermissions
         WHERE user_role_id = ? AND permission_id = ?`,
        [roleId, permissionId]
    );
};

module.exports = {
    ADMIN_ROLE,
    listPermissionTree,
    listRoleKeys,
    listMatrix,
    setRolePermission
};
