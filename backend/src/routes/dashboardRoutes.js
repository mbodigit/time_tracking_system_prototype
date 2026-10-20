const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, authorizePermission } = require('../middlewares/authMiddleware');

router.get('/dashboard',
    authenticateToken,
    authorizePermission('dashboard.view'),
    dashboardController.overview
);

module.exports = router;