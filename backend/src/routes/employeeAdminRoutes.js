const express = require('express');
const router = express.Router();
const employeeAdminController = require('../controllers/employeeAdminController');
const { authenticateToken, authorizePermission } = require('../middlewares/authMiddleware');

router.get('/admin/employees/options',
    authenticateToken,
    authorizePermission('admin.employees'),
    employeeAdminController.options
);

router.get('/admin/employees',
    authenticateToken,
    authorizePermission('admin.employees'),
    employeeAdminController.list
);

router.post('/admin/employees',
    authenticateToken,
    authorizePermission('admin.employees'),
    employeeAdminController.create
);

router.patch('/admin/employees/:id',
    authenticateToken,
    authorizePermission('admin.employees'),
    employeeAdminController.update
);

router.delete('/admin/employees/:id',
    authenticateToken,
    authorizePermission('admin.employees'),
    employeeAdminController.remove
);

router.post('/admin/employees/:id/user',
    authenticateToken,
    authorizePermission('admin.users'),
    employeeAdminController.createUser
);

router.patch('/admin/users/:id',
    authenticateToken,
    authorizePermission('admin.users'),
    employeeAdminController.updateUser
);

router.delete('/admin/users/:id',
    authenticateToken,
    authorizePermission('admin.users'),
    employeeAdminController.removeUser
);

module.exports = router;