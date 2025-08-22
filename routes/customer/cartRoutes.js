const express = require('express');
const router = express.Router();
const { 
  getCart, 
  addItemToCart, 
  updateCartItem, 
  removeItemFromCart,
  updateCartItemByComposite,
  removeItemByComposite,
  getProductsMini,
  getVariantsMini
} = require('../../controllers/customer/cartController');

const authenticate = require("../../middlewares/authenticate")
const isCustomer = require("../../middlewares/isCustomer")

// Get Cart
router.get('/', authenticate, isCustomer, getCart);

// Add Item to Cart
router.post('/add', authenticate, isCustomer, addItemToCart);

// Update Cart Item
router.put('/update/:cartItemId', authenticate, isCustomer, updateCartItem);

// Remove Item from Cart
router.delete('/remove/:cartItemId', authenticate, isCustomer, removeItemFromCart);

router.put('/update-quantity', authenticate, isCustomer, updateCartItemByComposite);

router.delete('/remove', authenticate, isCustomer, removeItemByComposite);

// Products mini API
router.get("/products/mini", getProductsMini);
router.post("/products/mini", getProductsMini);

// Variants mini API
router.get("/variants/mini", getVariantsMini);
router.post("/variants/mini", getVariantsMini);

module.exports = router;
