const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authenticateToken, authorizePermission } = require('../middlewares/authMiddleware');

router.get('/admin/company',
    authenticateToken,
    authorizePermission('admin.company'),
    companyController.get
);

router.patch('/admin/company',
    authenticateToken,
    authorizePermission('admin.company'),
    companyController.update
);

module.exports = router;
