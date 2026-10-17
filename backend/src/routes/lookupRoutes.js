const express = require('express');
const router = express.Router();
const lookupController = require('../controllers/lookupController');
const { authenticateToken, authorizePermission } = require('../middlewares/authMiddleware');

router.get('/employees',
    authenticateToken,
    authorizePermission('monthly_log.record'),
    lookupController.listEmployees
);

router.get('/absences',
    authenticateToken,
    authorizePermission('requests.submit'),
    lookupController.listAbsences
);

module.exports = router;