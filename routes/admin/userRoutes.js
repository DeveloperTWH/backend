const express = require('express');
const router = express.Router();
const authenticate = require('../../middlewares/authenticate');
const isAdmin = require('../../middlewares/isAdmin');
const {
  getAllUsers,
  getUserById,
  updateUserByAdmin,
  deleteUserByAdmin,
  toggleBlockUser,
} = require('../../controllers/admin/user.controller');

router.use(authenticate, isAdmin); // Global admin protection

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
