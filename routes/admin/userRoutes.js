const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authenticate = require('../../middlewares/authenticate');
const isAdmin = require('../../middlewares/isAdmin');
const {
  createAdminUser,
  getAllUsers,
  getUserById,
  updateUserByAdmin,
  deleteUserByAdmin,
  toggleBlockUser,
} = require('../../controllers/admin/user.controller');

router.use(authenticate, isAdmin); // Global admin protection

router.post(
  '/admins',
  [
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false }).withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('mobile').trim().notEmpty().withMessage('Mobile number is required').isMobilePhone('any').withMessage('Enter a valid mobile number'),
  ],
  createAdminUser
);

// List all users
router.get('/', getAllUsers);

// Get single user
router.get('/:id', getUserById);

// Update user by admin
router.put('/:id', updateUserByAdmin);

// Soft delete user
router.delete('/:id', deleteUserByAdmin);

// Block/unblock user
router.put('/:id/block', toggleBlockUser);

module.exports = router;
