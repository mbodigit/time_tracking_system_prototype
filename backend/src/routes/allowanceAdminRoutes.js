const express = require('express');
const router = express.Router();
const allowanceAdminController = require('../controllers/allowanceAdminController');
const { authenticateToken, authorizePermission } = require('../middlewares/authMiddleware');

router.get('/admin/allowances',
    authenticateToken,
    authorizePermission('master_data.allowances'),
    allowanceAdminController.list
);

router.patch('/admin/allowances/:id',
    authenticateToken,
    authorizePermission('master_data.allowances'),
    allowanceAdminController.update
);

module.exports = router;
