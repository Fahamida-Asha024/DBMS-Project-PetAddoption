const express = require('express');
const router = express.Router();
const {
  getAdoptions, getMyAdoptions, getAssignedToMe,
  createAdoption, approveAdoption, rejectAdoption, assignStaff, markDelivered,
} = require('../controllers/adoptions.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

router.post('/', verifyToken, requireRole('adopter'), createAdoption);
router.get('/mine', verifyToken, requireRole('adopter'), getMyAdoptions);

router.get('/assigned-to-me', verifyToken, requireRole('staff'), getAssignedToMe);
router.put('/:id/mark-delivered', verifyToken, requireRole('staff'), markDelivered);

router.get('/', verifyToken, requireRole('admin'), getAdoptions);
router.put('/:id/approve', verifyToken, requireRole('admin'), approveAdoption);
router.put('/:id/reject', verifyToken, requireRole('admin'), rejectAdoption);
router.put('/:id/assign-staff', verifyToken, requireRole('admin'), assignStaff);

module.exports = router;