const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const authenticate = require('../middlewares/authenticate');
const isBusinessOwner = require('../middlewares/isBusinessOwner');

// Route to get user's subscriptions
router.get('/user/subscriptions',authenticate, isBusinessOwner, subscriptionController.getUserSubscriptions);

module.exports = router;
