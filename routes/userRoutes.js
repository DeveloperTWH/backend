const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const userController = require('../controllers/userController');

const router = express.Router();

// Rate limiter for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again later.',
});

// Register route
router.post(
  '/register',
  [
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('mobile').trim().notEmpty().withMessage('Mobile number is required').isMobilePhone('any').withMessage('Enter a valid mobile number'),
    body('role').isIn(['admin', 'customer', 'business_owner']).withMessage('Invalid role'),
    body('gender').notEmpty().withMessage('Gender is required').isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
    body('minorityType').notEmpty().withMessage('Minority type is required'),
  ],
  userController.registerUser
);

// Login route
router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  userController.loginUser
);

router.post('/logout', userController.logout);

router.post(
  '/verify-otp',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  userController.verifyOtp
);

router.post(
  '/resend-otp',
  [body('email').isEmail().withMessage('Valid email is required')],
  userController.resendOtp
);


module.exports = router;
