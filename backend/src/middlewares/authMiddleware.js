const jwt = require('jsonwebtoken');


const authenticateToken = async (req, res, next) => {
    next();
};

module.exports = {authenticateToken};