const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/users'); // Import controller functions

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
  .put(updateUser)
  .delete(deleteUser);

module.exports = router;
