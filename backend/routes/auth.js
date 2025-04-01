const express = require('express');
const { register, login, getMe } = require('../controllers/auth'); // Import getMe
const { protect } = require('../middleware/auth'); // Import protect middleware

const router = express.Router();

// Define authentication routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe); // Add the protected /me route

module.exports = router;
