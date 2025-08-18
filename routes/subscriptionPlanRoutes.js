const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const isAdmin = require('../middlewares/isAdmin');
const {
  createSubscriptionPlan,
  updateSubscriptionPlan,
  listSubscriptionPlans,
  getSubscriptionPlan,
} = require('../controllers/subscriptionPlanController');

router.post('/', authenticate, isAdmin, createSubscriptionPlan);
router.put('/:id', authenticate, isAdmin, updateSubscriptionPlan);
router.get('/',  listSubscriptionPlans);
router.get('/:id', authenticate, isAdmin, getSubscriptionPlan);

module.exports = router;
