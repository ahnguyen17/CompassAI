const express = require('express');
const {
  getApiKeys,
  addApiKey,
  updateApiKey,
  deleteApiKey,
} = require('../controllers/apiKeys'); // Import controller functions

const router = express.Router();

// Import protection middleware
const { protect } = require('../middleware/auth');
// Optional: Import authorization middleware if specific roles are needed
const { authorize } = require('../middleware/auth'); // Uncommented authorize

// Apply protect middleware to all routes in this file
// Add role authorization to ensure only admins can manage global keys
router.route('/')
  .get(protect, authorize('admin'), getApiKeys) // Added authorize('admin')
  .post(protect, authorize('admin'), addApiKey); // Added authorize('admin')

router.route('/:id')
  .put(protect, authorize('admin'), updateApiKey) // Added authorize('admin')
  .delete(protect, authorize('admin'), deleteApiKey); // Added authorize('admin')

module.exports = router;
