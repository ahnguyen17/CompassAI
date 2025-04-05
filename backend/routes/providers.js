const express = require('express');
// Import the new controller function (will be created next)
const { getAvailableModels, getAllModels } = require('../controllers/providers'); 
const { protect } = require('../middleware/auth'); // Protect this route

const router = express.Router();

// Route to get available models for enabled providers (filtered by disabled) - Used by Chat Page
router.route('/models').get(protect, getAvailableModels);

// Route to get ALL potentially available models (unfiltered) - Used by Settings Page
router.route('/all-models').get(protect, getAllModels); 

module.exports = router;
