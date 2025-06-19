const express = require('express');
const { createProductWithVariants, addVariants  } = require('../controllers/productController');
const authenticate = require('../middlewares/authenticate');
const isBusinessOwner = require('../middlewares/isBusinessOwner');
const { validateProductInput, validateVariantInput  } = require('../validators/productValidators');

const router = express.Router();

router.post(
  '/',
  authenticate,
  isBusinessOwner,
  validateProductInput,
  createProductWithVariants
);


router.post(
  '/add-variants/:productId', // productId is passed in the URL to target a specific product
  authenticate,
  isBusinessOwner,
  validateVariantInput, // Validation for variant fields
  addVariants // Controller to handle adding variants
);




module.exports = router;
