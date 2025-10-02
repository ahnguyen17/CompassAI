const express = require('express');
const {
  getAIDocSessions,
  getAIDocSession,
  createAIDocSession,
  updateAIDocSession,
  deleteAIDocSession,
} = require('../controllers/aiDocSessions');

const router = express.Router();

// Import protection middleware
const { protect } = require('../middleware/auth');

// Import nested message router
const messageRouter = require('./aiDocMessages');

// Re-route requests to /:sessionId/messages to the message router
router.use('/:sessionId/messages', messageRouter);

// Apply protect middleware globally for all AIDoc session routes
router.use(protect);

// Session CRUD routes
router.route('/')
  .get(getAIDocSessions)
  .post(createAIDocSession);

router.route('/:id')
  .get(getAIDocSession)
  .put(updateAIDocSession)
  .delete(deleteAIDocSession);

module.exports = router;

