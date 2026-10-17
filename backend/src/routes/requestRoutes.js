const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { authenticateToken, authorizePermission } = require('../middlewares/authMiddleware');

router.post('/requests',
    authenticateToken,
    authorizePermission('requests.submit'),
    requestController.create
);

router.get('/requests',
    authenticateToken,
    authorizePermission('requests.submit'),
    requestController.list
);

router.patch('/requests/:id',
    authenticateToken,
    authorizePermission('requests.approve'),
    requestController.decide
);

router.patch('/requests/:id/withdraw',
    authenticateToken,
    authorizePermission('requests.submit'),
    requestController.withdraw
);

module.exports = router;