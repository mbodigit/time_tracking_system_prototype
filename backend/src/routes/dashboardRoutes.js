const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, authorizePermission, requireEmployee } = require('../middlewares/authMiddleware');

router.get('/dashboard',
    authenticateToken,
    requireEmployee,
    authorizePermission('dashboard'),
    dashboardController.overview
);

module.exports = router;