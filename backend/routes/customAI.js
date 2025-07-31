const express = require('express');
const multer = require('multer');
const {
  getCustomAIs,
  getCustomAI,
  createCustomAI,
  updateCustomAI,
  deleteCustomAI,
  duplicateCustomAI,
  uploadKnowledgeBaseFile,
  deleteKnowledgeBaseFile,
  getCustomAIForChat
} = require('../controllers/customAI');

const { protect } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads (using memory storage like existing chat files)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  }
});

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error("Multer Error:", err);
    let message = 'File upload error.';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File is too large. Maximum size is 10MB.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field.';
    }
    return res.status(400).json({ success: false, error: message });
  } else if (err) {
    console.error("Non-Multer Upload Error:", err);
    return res.status(500).json({ success: false, error: 'Error processing upload.' });
  }
  next();
};

// Apply protection middleware to all routes
router.use(protect);

// Main custom AI routes
router.route('/')
  .get(getCustomAIs)
  .post(createCustomAI);

router.route('/:id')
  .get(getCustomAI)
  .put(updateCustomAI)
  .delete(deleteCustomAI);

// Duplicate custom AI
router.route('/:id/duplicate')
  .post(duplicateCustomAI);

// Knowledge base file management
router.route('/:id/files')
  .post(upload.single('file'), handleMulterError, uploadKnowledgeBaseFile);

router.route('/:id/files/:fileId')
  .delete(deleteKnowledgeBaseFile);

// Chat context endpoint
router.route('/:id/chat-context')
  .get(getCustomAIForChat);

module.exports = router;
