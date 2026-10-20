const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const { authenticateToken, authorizePermission } = require('../middlewares/authMiddleware');

router.get('/calendar',
    authenticateToken,
    authorizePermission('admin.calendar'),
    calendarController.list
);

router.post('/calendar',
    authenticateToken,
    authorizePermission('admin.calendar'),
    calendarController.save
);

router.delete('/calendar/:date',
    authenticateToken,
    authorizePermission('admin.calendar'),
    calendarController.remove
);

module.exports = router;