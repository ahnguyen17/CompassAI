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
// const { authorize } = require('../middleware/auth');

// Apply protect middleware to all routes in this file
// Optional: Add role authorization like authorize('admin') if needed
router.route('/')
  .get(protect, getApiKeys)
  .post(protect, addApiKey);

router.route('/:id')
  .put(protect, updateApiKey)
  .delete(protect, deleteApiKey);

module.exports = router;
