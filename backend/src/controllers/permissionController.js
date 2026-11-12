const pool = require('../config/db');
const { invalidId, serverError } = require('../utils/apiResponse');
const {
    ADMIN_ROLE, listPermissionTree, listMatrix, setRolePermission
} = require('../services/permissions');

const list = async (req, res) => {
    try {
        const [roles] = await pool.execute(
            `SELECT user_role_id, user_role_name FROM UserRoles ORDER BY user_role_id`
        );

        return res.status(200).json({
            roles: roles.map((row) => ({
                id: row.user_role_id,
                name: row.user_role_name,
                isAdmin: row.user_role_name === ADMIN_ROLE
            })),
            permissions: await listPermissionTree(),
            matrix: await listMatrix()
        });
    } catch (error) {
        return serverError(res, 'Jogosultsági mátrix lekérdezési hiba', error);
    }
};

const update = async (req, res) => {
    const roleId = Number(req.body?.roleId);
    const permissionId = Number(req.body?.permissionId);
    const granted = Boolean(req.body?.granted);

    if (!roleId || !permissionId) {
        return invalidId(res);
    }

    try {
        const [roles] = await pool.execute(
            `SELECT user_role_name FROM UserRoles WHERE user_role_id = ?`,
            [roleId]
        );

        if (roles.length === 0) {
            return res.status(404).json({ message: 'A szerepkör nem található.' });
        }

        if (roles[0].user_role_name === ADMIN_ROLE) {
            return res.status(409).json({
                message: 'Az adminisztrátor jogosultságai nem módosíthatók, '
                    + 'különben kizárhatná magát a rendszerből.'
            });
        }

        const [permissions] = await pool.execute(
            `SELECT permission_is_group FROM Permissions WHERE permission_id = ?`,
            [permissionId]
        );

        if (permissions.length === 0) {
            return res.status(404).json({ message: 'A jogosultság nem található.' });
        }

        if (permissions[0].permission_is_group) {
            return res.status(409).json({
                message: 'A lap egészére nem adható jogosultság, '
                    + 'csak a hozzá tartozó füleken keresztül.'
            });
        }

        await setRolePermission(roleId, permissionId, granted);

        return res.status(200).json({
            message: granted
                ? 'A jogosultság megadásra került.'
                : 'A jogosultság visszavonásra került.'
        });
    } catch (error) {
        return serverError(res, 'Jogosultsági mátrix módosítási hiba', error);
    }
};

module.exports = { list, update };
