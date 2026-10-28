const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authenticateToken, authorizePermission } = require('../middlewares/authMiddleware');

router.get('/groups',
    authenticateToken,
    authorizePermission('admin.groups'),
    groupController.list
);

router.get('/groups/options',
    authenticateToken,
    authorizePermission('admin.groups'),
    groupController.options
);

router.get('/groups/members',
    authenticateToken,
    authorizePermission('admin.groups'),
    groupController.listAssignable
);

router.patch('/groups/:id/members',
    authenticateToken,
    authorizePermission('admin.groups'),
    groupController.updateMembers
);

router.post('/groups',
    authenticateToken,
    authorizePermission('admin.groups'),
    groupController.create
);

router.patch('/groups/:id',
    authenticateToken,
    authorizePermission('admin.groups'),
    groupController.update
);

router.delete('/groups/:id',
    authenticateToken,
    authorizePermission('admin.groups'),
    groupController.remove
);

module.exports = router;