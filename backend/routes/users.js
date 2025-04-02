const express = require('express');
const {
  getUsers, // Remove duplicate
  getUser,
  createUser,
  updateUser,
  deleteUser,
  adminResetPassword // Import the new controller function
} = require('../controllers/users');

const router = express.Router();

// Import middleware
const { protect, authorize } = require('../middleware/auth');

// Apply protect middleware to all routes in this file first
router.use(protect);
// Apply authorize middleware (admin only) to all routes
router.use(authorize('admin'));

// Define routes relative to /api/v1/users
router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .get(getUser)
  .put(updateUser) // Admin updates user details (role, etc.)
  .delete(deleteUser);

// Route for admin to reset a user's password
router.put('/:id/resetpassword', adminResetPassword);

module.exports = router;
