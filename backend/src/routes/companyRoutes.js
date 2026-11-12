const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authenticateToken, authorizePermission } = require('../middlewares/authMiddleware');

router.get('/admin/company',
    authenticateToken,
    authorizePermission('company.settings'),
    companyController.get
);

router.patch('/admin/company',
    authenticateToken,
    authorizePermission('company.settings'),
    companyController.update
);

module.exports = router;
