const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, authorizePermission } = require('../middlewares/authMiddleware');

router.get('/reports/monthly',
    authenticateToken,
    authorizePermission('reports.employees'),
    reportController.monthly
);

router.get('/reports/payroll',
    authenticateToken,
    authorizePermission('reports.employees'),
    reportController.payroll
);

router.get('/reports/statistics',
    authenticateToken,
    authorizePermission('reports.statistics'),
    reportController.statistics
);

module.exports = router;