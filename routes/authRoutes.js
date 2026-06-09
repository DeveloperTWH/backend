// routes/authRoutes.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controllers/authController');

function buildOAuthLimiter(max, message) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message,
    },
  });
}

const googleStartLimiter = buildOAuthLimiter(
  20,
  'Too many Google sign-in attempts. Please try again later.'
);

const googleCallbackLimiter = buildOAuthLimiter(
  20,
  'Too many Google sign-in callbacks. Please try again later.'
);

const googleCompleteLimiter = buildOAuthLimiter(
  10,
  'Too many Google profile completion attempts. Please try again later.'
);

// Web Google OAuth (redirect flow)
router.get('/google', googleStartLimiter, authController.startGoogleAuth);
router.get('/google/callback', googleCallbackLimiter, authController.handleGoogleCallback);

// Complete profile after Google (only if REQUIRE_PROFILE_COMPLETION=true)
router.post('/google/complete', googleCompleteLimiter, authController.completeGoogleProfile);

module.exports = router;
