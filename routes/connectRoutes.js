// routes/connectRoutes.js
const express = require('express');
const router = express.Router();

const { createAccountLink, getStatus, handleReturn, handleRefresh } = require('../controllers/connectController');

// Use your existing middlewares
const authenticate = require('../middlewares/authenticate');
const isBusinessOwner = require('../middlewares/isBusinessOwner');

// Create an onboarding link
router.post('/:businessId/account-link', authenticate, isBusinessOwner, createAccountLink);

// Check status
router.get('/:businessId/status', authenticate, isBusinessOwner, getStatus);

// Optional backend proxies for return/refresh (can be public)
router.get('/return', handleReturn);
router.get('/refresh', handleRefresh);

module.exports = router;
