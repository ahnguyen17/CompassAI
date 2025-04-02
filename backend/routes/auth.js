const express = require('express');
// Import new controller functions
const { register, login, getMe, updateDetails, updatePassword } = require('../controllers/auth');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Define authentication routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails); // Route for user to update own details
router.put('/updatepassword', protect, updatePassword); // Route for user to update own password

module.exports = router;
