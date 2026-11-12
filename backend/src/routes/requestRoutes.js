const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { authenticateToken, authorizePermission, requireEmployee } = require('../middlewares/authMiddleware');

router.post('/requests',
    authenticateToken,
    requireEmployee,
    authorizePermission('requests.own'),
    requestController.create
);

router.get('/requests',
    authenticateToken,
    requireEmployee,
    authorizePermission('requests.own'),
    requestController.list
);

router.patch('/requests/:id',
    authenticateToken,
    requireEmployee,
    authorizePermission('requests.approval'),
    requestController.decide
);

router.patch('/requests/:id/close',
    authenticateToken,
    requireEmployee,
    authorizePermission('requests.approval'),
    requestController.close
);

router.patch('/requests/:id/withdraw',
    authenticateToken,
    requireEmployee,
    authorizePermission('requests.own'),
    requestController.withdraw
);

module.exports = router;