const express = require('express');
const router = express.Router();
const { getDashboard, getAvailablePets, getAdoptedPets } = require('../controllers/reports.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/dashboard', verifyToken, requireRole('admin'), getDashboard);
router.get('/available-pets', verifyToken, requireRole('admin'), getAvailablePets);
router.get('/adopted-pets', verifyToken, requireRole('admin'), getAdoptedPets);

module.exports = router;