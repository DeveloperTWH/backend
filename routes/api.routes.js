const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/authenticate');
const isBusinessOwner = require('../middlewares/isBusinessOwner');

const {
  getCurrentSubscriptionForBusiness,
  cancelSubscriptionForBusiness,
  resumeSubscriptionForBusiness,
} = require('../controllers/subscriptions.controller');

const {
  createBillingPortalSessionForBusiness,
} = require('../controllers/billing.controller');

// Subscriptions (must be logged in + owner of the business)
router.get(
  '/subscriptions/current',
  authenticate,
  isBusinessOwner, // expects businessId in req.query
  getCurrentSubscriptionForBusiness
);

router.post(
  '/subscriptions/:id/cancel',
  authenticate,
  isBusinessOwner, // expects businessId in req.body
  cancelSubscriptionForBusiness
);

router.post(
  '/subscriptions/:id/resume',
  authenticate,
  isBusinessOwner, // expects businessId in req.body
  resumeSubscriptionForBusiness
);

// Billing Portal (must be logged in + owner of the business)
router.post(
  '/billing-portal/session',
  authenticate,
  isBusinessOwner, // expects businessId in req.body
  createBillingPortalSessionForBusiness
);

module.exports = router;
