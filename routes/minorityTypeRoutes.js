const express = require('express');
const router = express.Router();
const minorityTypeController = require('../controllers/minorityTypeController');
const authenticate = require('../middlewares/authenticate');
const isAdmin = require('../middlewares/isAdmin');


router.get('/', minorityTypeController.getAllMinorityTypes);

// ADMIN: Create, Update, Delete, Get all minority types (active + inactive)

router.get('/admin/all', authenticate, isAdmin, minorityTypeController.getAllMinorityTypesAdmin);
router.post('/', authenticate, isAdmin, minorityTypeController.createMinorityType);
router.put('/:id', authenticate, isAdmin, minorityTypeController.updateMinorityType);
router.delete('/:id', authenticate, isAdmin, minorityTypeController.deleteMinorityType);

module.exports = router;
