const express = require('express');
const {
  getChatSessions,
  getChatSession,
  createChatSession,
  updateChatSession,
  deleteChatSession,
  getSharedChatSession, // Import the public function
  copySharedChatSession // Import the new copy function
} = require('../controllers/chatSessions'); // Import controller functions

const router = express.Router();

// Add logging middleware at the very start of this router
router.use((req, res, next) => {
    console.log(`>>> Request received by chatSessions router for path: ${req.originalUrl}, Method: ${req.method}`);
    next();
});

// Import protection middleware
const { protect } = require('../middleware/auth');

// Import nested message router
const messageRouter = require('./chatMessages');

// Public route for shared sessions - must come before protected routes
router.route('/shared/:shareId').get(getSharedChatSession);

// Re-route requests to /:sessionId/messages to the message router
router.use('/:sessionId/messages', messageRouter);

// Apply protect middleware globally for other session routes below this point
router.use(protect);

// --- Session CRUD routes (now protected by the router.use(protect) above) ---
router.route('/') // Corresponds to /api/v1/chatsessions
  .get(getChatSessions)
  .post(createChatSession);

router.route('/:id')
  .get(getChatSession)
  .put(updateChatSession)
  .delete(deleteChatSession);

// Route to copy a shared session (must be protected)
router.route('/copy/:shareId').post(copySharedChatSession);


// Note: Routes for adding/getting messages within a session will likely be separate
// e.g., router.route('/:sessionId/messages').get(getMessages).post(addMessage);

module.exports = router;
