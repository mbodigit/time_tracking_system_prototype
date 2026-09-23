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

    next();
};

module.exports = {authenticateToken};