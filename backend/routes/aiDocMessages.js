const express = require('express');
const {
  getMessagesForAIDocSession,
  addMessageToAIDocSession
} = require('../controllers/aiDocMessages');

const router = express.Router({ mergeParams: true });

// Import protection middleware
const { protect } = require('../middleware/auth');

// Apply protect middleware to all routes
router.use(protect);

// Define routes
router.route('/')
  .get(getMessagesForAIDocSession)
  .post(addMessageToAIDocSession);

module.exports = router;

