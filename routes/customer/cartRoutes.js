const express = require('express');
const router = express.Router();
const { 
  getCart, 
  addItemToCart, 
  updateCartItem, 
  removeItemFromCart,
  updateCartItemByComposite,
  removeItemByComposite
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

module.exports = router;
