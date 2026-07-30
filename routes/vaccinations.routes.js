const express = require('express');
const router = express.Router();
const {
  getVaccinations, createVaccination, updateVaccination, deleteVaccination,
} = require('../controllers/vaccinations.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', getVaccinations);

router.post('/', verifyToken, requireRole('staff', 'admin'), createVaccination);
router.put('/:id', verifyToken, requireRole('staff', 'admin'), updateVaccination);
router.delete('/:id', verifyToken, requireRole('staff', 'admin'), deleteVaccination);

module.exports = router;