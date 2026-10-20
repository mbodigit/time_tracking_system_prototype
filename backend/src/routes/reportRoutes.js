const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, authorizePermission } = require('../middlewares/authMiddleware');

router.get('/reports/monthly',
    authenticateToken,
    authorizePermission('reports.view'),
    reportController.monthly
);

router.get('/reports/payroll',
    authenticateToken,
    authorizePermission('reports.export'),
    reportController.payroll
);

module.exports = router;