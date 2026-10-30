const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({
            message: 'Hozzáférés megtagadva. Hiányzik az Authorization fejléc.',
            code: 'NO_TOKEN'
        });
    }

    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            message: 'Hibás token formátum. Sablon: Bearer <token>',
            code: 'NO_TOKEN'
        });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            message: 'A fejléc megvan, de a token üres.',
            code: 'NO_TOKEN'
        });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return res.status(403).json({
            message: 'Érvénytelen, módosított vagy lejárt token.',
            code: 'INVALID_TOKEN'
        });
    }

    const PASSWORD_CHANGE_ALLOWED = [
        {method: 'GET', path: '/api/me'},
        {method: 'PATCH', path: '/api/me/password'}
    ];

    const path = req.originalUrl.split('?')[0];
    const isAllowed = PASSWORD_CHANGE_ALLOWED.some(
        (allowed) => allowed.method === req.method && allowed.path === path
    );

    if (req.user.mustChangePassword && !isAllowed){
        return res.status(403).json({
            message: 'Az alapértelmezett jelszó megváltoztatása szükséges a rendszeren való további használatához.',
            mustChangePassword: true
        });
    }

    next();
};

const hasPermission = async (role, permissionKey) => {
    if (role === 'Admin') {
        return true;
    }

    const [rows] = await pool.execute(
        `SELECT 1
         FROM RolePermissions rp
         JOIN Permissions p ON p.permission_id = rp.permission_id
         JOIN UserRoles   r ON r.user_role_id  = rp.user_role_id
         WHERE r.user_role_name = ?
           AND p.permission_key = ?
         LIMIT 1`,
        [role, permissionKey]
    );

    return rows.length > 0;
};

const authorizeAnyPermission = (...permissionKeys) => {
    return async (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({
                message: 'Hitelesítés szükséges ehhez a művelethez.'
            });
        }

        try {
            for (const permissionKey of permissionKeys) {
                if (await hasPermission(req.user.role, permissionKey)) {
                    return next();
                }
            }
        } catch (error) {
            console.error('Jogosultság-ellenőrzési hiba:', error);
            return res.status(500).json({ message: 'Szerver hiba.' });
        }

        console.warn(`Megtagadva: ${req.user.role} / ${permissionKeys.join(' vagy ')}`);
        return res.status(403).json({ message: 'Nincs jogosultsága ehhez a művelethez.' });
    };
};

const authorizePermission = (permissionKey) => authorizeAnyPermission(permissionKey);

module.exports = {authenticateToken, authorizePermission, authorizeAnyPermission};