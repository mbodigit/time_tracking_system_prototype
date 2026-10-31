const express = require('express');
const router = express.Router();
const lookupController = require('../controllers/lookupController');
const { authenticateToken, authorizePermission, requireEmployee } = require('../middlewares/authMiddleware');

router.get('/employees',
    authenticateToken,
    requireEmployee,
    authorizePermission('monthly_log.record'),
    lookupController.listEmployees
);

router.get('/absences',
    authenticateToken,
    requireEmployee,
    authorizePermission('requests.submit'),
    lookupController.listAbsences
);

module.exports = router;