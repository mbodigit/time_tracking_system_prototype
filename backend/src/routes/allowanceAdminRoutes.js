const express = require('express');
const router = express.Router();
const allowanceAdminController = require('../controllers/allowanceAdminController');
const { authenticateToken, authorizePermission } = require('../middlewares/authMiddleware');

router.get('/admin/allowances',
    authenticateToken,
    authorizePermission('admin.absences'),
    allowanceAdminController.list
);

router.patch('/admin/allowances/:id',
    authenticateToken,
    authorizePermission('admin.absences'),
    allowanceAdminController.update
);

module.exports = router;
