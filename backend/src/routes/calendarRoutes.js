const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const { authenticateToken, authorizePermission, requireEmployee } = require('../middlewares/authMiddleware');

router.get('/calendar',
    authenticateToken,
    requireEmployee,
    authorizePermission('admin.calendar'),
    calendarController.list
);

router.post('/calendar',
    authenticateToken,
    requireEmployee,
    authorizePermission('admin.calendar'),
    calendarController.save
);

router.delete('/calendar/:date',
    authenticateToken,
    requireEmployee,
    authorizePermission('admin.calendar'),
    calendarController.remove
);

module.exports = router;