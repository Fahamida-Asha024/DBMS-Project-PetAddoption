const express = require('express');
const router = express.Router();
const { getAdopters, getMyAdopter, createAdopter, updateAdopter, deleteAdopter } = require('../controllers/adopters.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

router.post('/', createAdopter);
router.get('/me', verifyToken, getMyAdopter);

router.get('/', verifyToken, requireRole('staff', 'admin'), getAdopters);
router.put('/:id', verifyToken, requireRole('staff', 'admin'), updateAdopter);
router.delete('/:id', verifyToken, requireRole('staff', 'admin'), deleteAdopter);

module.exports = router;