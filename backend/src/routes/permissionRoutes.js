const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const { authenticateToken, authorizePermission } = require('../middlewares/authMiddleware');

router.get('/admin/permissions',
    authenticateToken,
    authorizePermission('permissions'),
    permissionController.list
);

router.patch('/admin/permissions',
    authenticateToken,
    authorizePermission('permissions'),
    permissionController.update
);

module.exports = router;
