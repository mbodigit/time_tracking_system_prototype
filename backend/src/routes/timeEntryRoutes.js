const express = require('express');
const router = express.Router();
const timeEntryController = require('../controllers/timeEntryController');
const { authenticateToken, authorizePermission } = require('../middlewares/authMiddleware');

router.post('/time-entries',
    authenticateToken,
    authorizePermission('monthly_log.record'),
    timeEntryController.create
);

module.exports = router;