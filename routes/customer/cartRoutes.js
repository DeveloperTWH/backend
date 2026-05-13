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
  getVariantsMini,
  getCount,
  mergeGuestCart
} = require('../../controllers/customer/cartController');

const authenticate = require("../../middlewares/authenticate")
const isCustomer = require("../../middlewares/isCustomer")

// Get Cart
router.get('/', authenticate, getCart);

// Add Item to Cart
router.post('/add', authenticate, addItemToCart);

// Update Cart Item
router.put('/update/:cartItemId', authenticate, updateCartItem);

// Remove Item from Cart
router.delete('/remove/:cartItemId', authenticate, removeItemFromCart);

router.put('/update-quantity', authenticate, updateCartItemByComposite);

router.delete('/remove', authenticate, removeItemByComposite);

// Products mini API
router.get("/products/mini", getProductsMini);
router.post("/products/mini", getProductsMini);

// Variants mini API
router.get("/variants/mini", getVariantsMini);
router.post("/variants/mini", getVariantsMini);


router.get("/count", authenticate, getCount);
router.post("/merge", authenticate, mergeGuestCart);

module.exports = router;
