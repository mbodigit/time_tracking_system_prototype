const express = require('express');
const router = express.Router();
const timeEntryController = require('../controllers/timeEntryController');
const { authenticateToken, authorizePermission, requireEmployee } = require('../middlewares/authMiddleware');

router.post('/time-entries',
    authenticateToken,
    requireEmployee,
    authorizePermission('time_log.own'),
    timeEntryController.create
);

router.get('/time-entries',
    authenticateToken,
    requireEmployee,
    authorizePermission('time_log.own'),
    timeEntryController.list
);

router.patch('/time-entries/:id',
    authenticateToken,
    requireEmployee,
    authorizePermission('time_log.own'),
    timeEntryController.update
);

router.delete('/time-entries/:id',
    authenticateToken,
    requireEmployee,
    authorizePermission('time_log.own'),
    timeEntryController.remove
);

router.put('/time-entries/ordered',
    authenticateToken,
    requireEmployee,
    authorizePermission('requests.ordered'),
    timeEntryController.setOrdered
);

router.get('/time-entries/daily',
    authenticateToken,
    requireEmployee,
    authorizePermission('time_log.group'),
    timeEntryController.listDaily
);

router.post('/time-entries/bulk',
    authenticateToken,
    requireEmployee,
    authorizePermission('time_log.group'),
    timeEntryController.createBulk
);

module.exports = router;