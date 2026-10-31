const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { authenticateToken, authorizePermission, requireEmployee } = require('../middlewares/authMiddleware');

router.post('/requests',
    authenticateToken,
    requireEmployee,
    authorizePermission('requests.submit'),
    requestController.create
);

router.get('/requests',
    authenticateToken,
    requireEmployee,
    authorizePermission('requests.submit'),
    requestController.list
);

router.patch('/requests/:id',
    authenticateToken,
    requireEmployee,
    authorizePermission('requests.approve'),
    requestController.decide
);

router.patch('/requests/:id/withdraw',
    authenticateToken,
    requireEmployee,
    authorizePermission('requests.submit'),
    requestController.withdraw
);

module.exports = router;