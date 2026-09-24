const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.get('/me', authenticateToken, profileController.getMe);
router.patch('/me/password', authenticateToken, profileController.changePassword);

module.exports = router;