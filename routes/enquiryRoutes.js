const express = require('express');

const router = express.Router();

const authenticate = require('../middlewares/authenticate');
const isCustomer = require('../middlewares/isCustomer');
const isBusinessOwner = require('../middlewares/isBusinessOwner');
const {
  createRevealEnquiry,
  getVendorEnquiries,
} = require('../controllers/customer/enquiry');

router.post('/reveal', authenticate, createRevealEnquiry);
router.get('/vendor', authenticate, isBusinessOwner, getVendorEnquiries);

module.exports = router;
