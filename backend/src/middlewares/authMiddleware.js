const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ message: 'Hozzáférés megtagadva. Hiányzik az Authorization fejléc.' });
    }

    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Hibás token formátum. Sablon: Bearer <token>' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'A fejléc megvan, de a token üres.' });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return res.status(403).json({ message: 'Érvénytelen, módosított vagy lejárt token.' });
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

module.exports = {authenticateToken};