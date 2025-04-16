const express = require('express');
const { getSettings, updateSettings } = require('../controllers/settings');
const { protect, authorize } = require('../middleware/auth'); // Assuming auth middleware is in ../middleware/auth

const router = express.Router();

// Apply protect middleware to all routes in this file
router.use(protect);

// Route to get settings (accessible to all authenticated users, but frontend might restrict visibility)
router.get('/', getSettings);

// Route to update settings (accessible only to admins)
router.put('/', authorize('admin'), updateSettings);

module.exports = router;
