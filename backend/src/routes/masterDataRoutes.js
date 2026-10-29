const express = require('express');
const router = express.Router();
const masterDataController = require('../controllers/masterDataController');
const { authenticateToken, authorizePermission } = require('../middlewares/authMiddleware');

const authorizeEntity = (req, res, next) => {
    const entity = masterDataController.resolveEntity(req.params.entity);

    if (!entity) {
        return res.status(400).json({ message: 'Ismeretlen törzsadat.' });
    }

    return authorizePermission(entity.permission)(req, res, next);
};

router.get('/admin/master-data/:entity',
    authenticateToken,
    authorizeEntity,
    masterDataController.list
);

router.post('/admin/master-data/:entity',
    authenticateToken,
    authorizeEntity,
    masterDataController.create
);

router.patch('/admin/master-data/:entity/:id',
    authenticateToken,
    authorizeEntity,
    masterDataController.update
);

router.delete('/admin/master-data/:entity/:id',
    authenticateToken,
    authorizeEntity,
    masterDataController.remove
);

module.exports = router;