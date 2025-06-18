const express = require('express');
const { createProductWithVariants } = require('../controllers/productController');
const authenticate = require('../middlewares/authenticate');
const isBusinessOwner = require('../middlewares/isBusinessOwner');
const { validateProductInput } = require('../validators/productValidators');

const router = express.Router();

router.post(
  '/',
  authenticate,
  isBusinessOwner,
  validateProductInput,
  createProductWithVariants
);

module.exports = router;
