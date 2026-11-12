const express = require('express');
const router = express.Router();
const orgController = require('../controllers/orgController');
const { authenticateToken, authorizePermission } = require('../middlewares/authMiddleware');

router.get('/org',
    authenticateToken,
    authorizePermission('organisation'),
    orgController.tree
);

router.post('/org/:entity',
    authenticateToken,
    authorizePermission('organisation'),
    orgController.create
);

router.patch('/org/:entity/:id',
    authenticateToken,
    authorizePermission('organisation'),
    orgController.update
);

router.delete('/org/:entity/:id',
    authenticateToken,
    authorizePermission('organisation'),
    orgController.remove
);

module.exports = router;