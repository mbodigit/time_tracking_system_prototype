const express = require('express');
const router = express.Router();
const employeeAdminController = require('../controllers/employeeAdminController');
const { authenticateToken, authorizePermission } = require('../middlewares/authMiddleware');

router.get('/admin/employees/options',
    authenticateToken,
    authorizePermission('employees.list'),
    employeeAdminController.options
);

router.get('/admin/employees',
    authenticateToken,
    authorizePermission('employees.list'),
    employeeAdminController.list
);

router.post('/admin/employees',
    authenticateToken,
    authorizePermission('employees.list'),
    employeeAdminController.create
);

router.patch('/admin/employees/:id',
    authenticateToken,
    authorizePermission('employees.list'),
    employeeAdminController.update
);

router.delete('/admin/employees/:id',
    authenticateToken,
    authorizePermission('employees.list'),
    employeeAdminController.remove
);

router.post('/admin/employees/:id/user',
    authenticateToken,
    authorizePermission('employees.accounts'),
    employeeAdminController.createUser
);

router.patch('/admin/users/:id',
    authenticateToken,
    authorizePermission('employees.accounts'),
    employeeAdminController.updateUser
);

router.delete('/admin/users/:id',
    authenticateToken,
    authorizePermission('employees.accounts'),
    employeeAdminController.removeUser
);

module.exports = router;