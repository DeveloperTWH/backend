// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Web Google OAuth (redirect flow)
router.get('/google', authController.startGoogleAuth);
router.get('/google/callback', authController.handleGoogleCallback);

// Complete profile after Google (only if REQUIRE_PROFILE_COMPLETION=true)
router.post('/google/complete', authController.completeGoogleProfile);

module.exports = router;
