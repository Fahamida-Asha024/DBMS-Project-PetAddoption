const express = require('express');
const router = express.Router();
const { getNotifications, markRead } = require('../controllers/notifications.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', verifyToken, requireRole('admin', 'staff'), getNotifications);
router.put('/:id/read', verifyToken, requireRole('admin', 'staff'), markRead);

module.exports = router;