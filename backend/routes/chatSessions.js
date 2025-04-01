const express = require('express');
const {
  getChatSessions,
  getChatSession,
  createChatSession,
  updateChatSession,
  deleteChatSession,
  getSharedChatSession // Import the public function
} = require('../controllers/chatSessions'); // Import controller functions

const router = express.Router();

// Import protection middleware
const { protect } = require('../middleware/auth');

// Import nested message router
const messageRouter = require('./chatMessages');

// Public route for shared sessions - must come before routes with :id parameter
router.route('/shared/:shareId').get(getSharedChatSession);

// Re-route requests to /:sessionId/messages to the message router
router.use('/:sessionId/messages', messageRouter);

// Apply protect middleware to all routes below this point for the logged-in user's sessions
router.use(protect);

router.route('/')
  .get(getChatSessions)
  .post(createChatSession);

router.route('/:id')
  .get(getChatSession)
  .put(updateChatSession)
  .delete(deleteChatSession);

// Note: Routes for adding/getting messages within a session will likely be separate
// e.g., router.route('/:sessionId/messages').get(getMessages).post(addMessage);

module.exports = router;
