const express = require('express');
const router = express.Router();
const { createAccountSession, createExpressLoginLink, getAccountBalance, getLastPayout, backfillMissingStripeCustomers } = require('../controllers/stripe.controller');

// POST /stripe/account-session
router.post('/account-session', createAccountSession);
router.post('/express-login-link', createExpressLoginLink);

router.get('/account-balance', getAccountBalance);
router.get('/last-payout', getLastPayout);

router.post('/backfill-customers', backfillMissingStripeCustomers);



module.exports = router;
