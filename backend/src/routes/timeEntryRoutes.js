const express = require('express');
const router = express.Router();
const timeEntryController = require('../controllers/timeEntryController');
const { authenticateToken, authorizePermission } = require('../middlewares/authMiddleware');

router.post('/time-entries',
    authenticateToken,
    authorizePermission('monthly_log.record'),
    timeEntryController.create
);

router.get('/time-entries',
    authenticateToken,
    authorizePermission('monthly_log.record'),
    timeEntryController.list
);

router.patch('/time-entries/:id',
    authenticateToken,
    authorizePermission('monthly_log.record'),
    timeEntryController.update
);

router.put('/time-entries/ordered',
    authenticateToken,
    authorizePermission('monthly_log.edit_past'),
    timeEntryController.setOrdered
);

router.get('/time-entries/daily',
    authenticateToken,
    authorizePermission('group_log.record'),
    timeEntryController.listDaily
);

router.post('/time-entries/bulk',
    authenticateToken,
    authorizePermission('group_log.record'),
    timeEntryController.createBulk
);

module.exports = router;