const express = require('express');
const router = express.Router();

const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} = require('../../controllers/customer/wishlist.controller');

const authenticate = require('../../middlewares/authenticate');
const isCustomer = require('../../middlewares/isCustomer');

router.use(authenticate, isCustomer); // Only authenticated customers

router.get('/', getWishlist);
router.post('/:productVariantId', addToWishlist);
router.delete('/:productVariantId', removeFromWishlist);

module.exports = router;
