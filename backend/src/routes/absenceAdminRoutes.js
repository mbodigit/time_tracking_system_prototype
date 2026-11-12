const express = require('express');
const router = express.Router();
const absenceAdminController = require('../controllers/absenceAdminController');
const { authenticateToken, authorizePermission } = require('../middlewares/authMiddleware');

router.get('/admin/absences',
    authenticateToken,
    authorizePermission('master_data.absences'),
    absenceAdminController.list
);

router.post('/admin/absences',
    authenticateToken,
    authorizePermission('master_data.absences'),
    absenceAdminController.create
);

router.patch('/admin/absences/:id',
    authenticateToken,
    authorizePermission('master_data.absences'),
    absenceAdminController.update
);

router.delete('/admin/absences/:id',
    authenticateToken,
    authorizePermission('master_data.absences'),
    absenceAdminController.remove
);

module.exports = router;