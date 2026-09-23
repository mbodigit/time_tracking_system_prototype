const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.get('/me', authenticateToken, profileController.getMe);

module.exports = router;