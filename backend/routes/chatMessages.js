const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  getMessagesForSession,
  addMessageToSession
} = require('../controllers/chatMessages');

// Import protection middleware
const { protect } = require('../middleware/auth');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Save files to the 'uploads' directory
  },
  filename: function (req, file, cb) {
    // Create a unique filename: fieldname-timestamp.ext
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Optional: Add file filter (e.g., limit file types or size)
// const fileFilter = (req, file, cb) => { ... };

const upload = multer({ storage: storage /*, fileFilter: fileFilter */ });

// Create router with mergeParams: true to access :sessionId from parent router
const router = express.Router({ mergeParams: true });

// Apply protect middleware to all routes in this file
router.use(protect);

// Define routes relative to /api/v1/chatsessions/:sessionId/messages
router.route('/')
  .get(getMessagesForSession)
  // Use multer middleware for the POST route to handle single file upload on field 'file'
  .post(upload.single('file'), addMessageToSession);

module.exports = router;
