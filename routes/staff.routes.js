const express = require('express');
const router = express.Router();
const { listStaff, createStaff } = require('../controllers/staff.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', verifyToken, requireRole('admin'), listStaff);
router.post('/', verifyToken, requireRole('admin'), createStaff);

module.exports = router;