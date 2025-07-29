const express = require('express');
const { createProductWithVariants, addVariants, updateVariant, deleteVariant, deleteProduct, getProductById, updateProduct,getVariantById  } = require('../controllers/productController');
const authenticate = require('../middlewares/authenticate');
const isBusinessOwner = require('../middlewares/isBusinessOwner');
const { validateProductInput, validateVariantInput  } = require('../validators/productValidators');

const router = express.Router();

router.get(
  '/:productId',
  authenticate,
  isBusinessOwner,
  getProductById
);


router.put(
  '/:productId',
  authenticate,
  isBusinessOwner,
  updateProduct
);



router.post(
  '/',
  authenticate,
  isBusinessOwner,
  validateProductInput,
  createProductWithVariants
);


router.get(
  '/get-variant/:productId/:variantId',
  authenticate,
  isBusinessOwner,
  getVariantById
);


router.post(
  '/add-variants/:productId', // productId is passed in the URL to target a specific product
  authenticate,
  isBusinessOwner,
  validateVariantInput, // Validation for variant fields
  addVariants // Controller to handle adding variants
);


router.put(
  '/update-variant/:productId/:variantId',
  authenticate,
  isBusinessOwner,
  validateVariantInput, 
  updateVariant 
);


router.delete(
  '/delete-variant/:productId/:variantId', // productId and variantId in URL
  authenticate,
  isBusinessOwner,
  deleteVariant // Controller to handle variant deletion
);



router.delete(
  '/delete-product/:productId', // productId in URL
  authenticate,
  isBusinessOwner,
  deleteProduct // Controller to handle product deletion
);





module.exports = router;
