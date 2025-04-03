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
    // Use relative path; server.js ensures this directory exists at backend root
    cb(null, 'uploads/');
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

// Add logging middleware at the very start of this router
router.use((req, res, next) => {
    console.log(`>>> Request received by chatMessages router for path: ${req.originalUrl}, Method: ${req.method}`);
    next();
});

// Apply protect middleware to all routes in this file
router.use(protect);

// Define routes relative to /api/v1/chatsessions/:sessionId/messages
// Custom Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error("Multer Error:", err);
        let message = 'File upload error.';
        if (err.code === 'LIMIT_FILE_SIZE') {
            message = 'File is too large.'; // Add size limit info if configured
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            message = 'Unexpected file field.';
        }
        // Add more specific Multer error codes as needed
        return res.status(400).json({ success: false, error: message });
    } else if (err) {
        // Handle other potential errors during upload if necessary
        console.error("Non-Multer Upload Error:", err);
        return res.status(500).json({ success: false, error: 'Error processing upload.' });
    }
    // If no error or not a Multer error, proceed
    next();
};

// Define routes explicitly instead of chaining with router.route()
router.get('/', getMessagesForSession);

router.post('/', upload.single('file'), handleMulterError, addMessageToSession);

module.exports = router;
