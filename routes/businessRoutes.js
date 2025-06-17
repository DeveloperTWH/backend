const express = require('express');
const { body } = require('express-validator');

const router = express.Router();

const authenticate = require('../middlewares/authenticate');
const isBusinessOwner = require('../middlewares/isBusinessOwner');
const upload = require('../middlewares/upload');
const businessController = require('../controllers/businessController');

// Validation middleware
const validateBusiness = [
  body('businessName').trim().notEmpty().withMessage('Business name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').isMobilePhone().withMessage('Valid phone number is required'),
  body('description').optional().trim(),
  body('website').optional().isURL().withMessage('Website must be a valid URL'),
];

// Create a business (protected)
router.post(
  '/',
  authenticate,
  isBusinessOwner,
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  validateBusiness,
  businessController.createBusiness
);

// Get businesses for current user
router.get(
  '/my',
  authenticate,
  isBusinessOwner,
  businessController.getMyBusinesses
);



router.put(
  '/:id',
  authenticate,
  isBusinessOwner,
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  businessController.updateBusiness
);

// Delete business
router.delete(
  '/:id',
  authenticate,
  isBusinessOwner,
  businessController.deleteBusiness
);




// Test route
router.get('/', (req, res) => {
  res.send('<div>Hello World</div>');
});

module.exports = router;
