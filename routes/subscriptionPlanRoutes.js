const express = require('express');
const { createSubscriptionPlan } = require('../controllers/subscriptionPlanController');
const authenticate = require('../middlewares/authenticate');
const isAdmin = require('../middlewares/isAdmin');

const router = express.Router();

// POST /api/subscription-plans
router.post('/', authenticate, isAdmin, createSubscriptionPlan);

router.get('/test', (req, res) => {
  res.send('<div>Hello World</div>');
});


module.exports = router;
