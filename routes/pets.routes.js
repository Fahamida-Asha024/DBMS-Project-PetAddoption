const express = require('express');
const router = express.Router();
const { getPets, getPetById, createPet, updatePet, deletePet } = require('../controllers/pets.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', getPets);
router.get('/:id', getPetById);

// Only admin can add/edit/delete pet listings now — staff just cares for/delivers pets
router.post('/', verifyToken, requireRole('admin'), createPet);
router.put('/:id', verifyToken, requireRole('admin'), updatePet);
router.delete('/:id', verifyToken, requireRole('admin'), deletePet);

module.exports = router;