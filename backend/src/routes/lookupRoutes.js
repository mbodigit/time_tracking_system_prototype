const express = require('express');
const router = express.Router();
const lookupController = require('../controllers/lookupController');
const { authenticateToken, authorizePermission, requireEmployee } = require('../middlewares/authMiddleware');

router.get('/employees',
    authenticateToken,
    requireEmployee,
    authorizePermission('time_log.own'),
    lookupController.listEmployees
);

router.get('/absences',
    authenticateToken,
    requireEmployee,
    authorizePermission('requests.own'),
    lookupController.listAbsences
);

module.exports = router;