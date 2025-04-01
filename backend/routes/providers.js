const express = require('express');
const { getAvailableModels } = require('../controllers/providers');
const { protect } = require('../middleware/auth'); // Protect this route

const router = express.Router();

router.route('/models').get(protect, getAvailableModels);

module.exports = router;
