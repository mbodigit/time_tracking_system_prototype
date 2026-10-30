const express = require('express');
const router = express.Router();
const orgController = require('../controllers/orgController');
const { authenticateToken, authorizePermission, authorizeAnyPermission } = require('../middlewares/authMiddleware');

router.get('/org',
    authenticateToken,
    authorizeAnyPermission('admin.org_structure', 'admin.structure.view'),
    orgController.tree
);

router.post('/org/:entity',
    authenticateToken,
    authorizePermission('admin.org_structure'),
    orgController.create
);

router.patch('/org/:entity/:id',
    authenticateToken,
    authorizePermission('admin.org_structure'),
    orgController.update
);

router.delete('/org/:entity/:id',
    authenticateToken,
    authorizePermission('admin.org_structure'),
    orgController.remove
);

module.exports = router;