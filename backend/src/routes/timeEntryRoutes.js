const express = require('express');
const router = express.Router();
const timeEntryController = require('../controllers/timeEntryController');
const { authenticateToken, authorizePermission, requireEmployee } = require('../middlewares/authMiddleware');

router.post('/time-entries',
    authenticateToken,
    requireEmployee,
    authorizePermission('monthly_log.record'),
    timeEntryController.create
);

router.get('/time-entries',
    authenticateToken,
    requireEmployee,
    authorizePermission('monthly_log.record'),
    timeEntryController.list
);

router.patch('/time-entries/:id',
    authenticateToken,
    requireEmployee,
    authorizePermission('monthly_log.record'),
    timeEntryController.update
);

router.put('/time-entries/ordered',
    authenticateToken,
    requireEmployee,
    authorizePermission('monthly_log.edit_past'),
    timeEntryController.setOrdered
);

router.get('/time-entries/daily',
    authenticateToken,
    requireEmployee,
    authorizePermission('group_log.record'),
    timeEntryController.listDaily
);

router.post('/time-entries/bulk',
    authenticateToken,
    requireEmployee,
    authorizePermission('group_log.record'),
    timeEntryController.createBulk
);

module.exports = router;