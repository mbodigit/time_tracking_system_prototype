const express = require('express');
const router = express.Router();
const orgController = require('../controllers/orgController');
const { authenticateToken, authorizePermission } = require('../middlewares/authMiddleware');

router.get('/org',
    authenticateToken,
    authorizePermission('admin.org_structure'),
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