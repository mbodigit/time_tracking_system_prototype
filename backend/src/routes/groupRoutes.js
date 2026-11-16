const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authenticateToken, authorizePermission } = require('../middlewares/authMiddleware');

router.get('/groups',
    authenticateToken,
    authorizePermission('organisation'),
    groupController.list
);

router.get('/groups/options',
    authenticateToken,
    authorizePermission('organisation'),
    groupController.options
);

router.get('/groups/members',
    authenticateToken,
    authorizePermission('organisation'),
    groupController.listAssignable
);

router.patch('/groups/:id/members',
    authenticateToken,
    authorizePermission('organisation.edit'),
    groupController.updateMembers
);

router.post('/groups',
    authenticateToken,
    authorizePermission('organisation.edit'),
    groupController.create
);

router.patch('/groups/:id',
    authenticateToken,
    authorizePermission('organisation.edit'),
    groupController.update
);

router.delete('/groups/:id',
    authenticateToken,
    authorizePermission('organisation.edit'),
    groupController.remove
);

module.exports = router;