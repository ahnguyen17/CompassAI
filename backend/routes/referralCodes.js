const express = require('express');
const {
    getReferralCodes,
    addReferralCode,
    deleteReferralCode,
    getReferralStatus // Import the new controller
} = require('../controllers/referralCodes');

const router = express.Router();

// Import middleware
const { protect, authorize } = require('../middleware/auth');

// Public route to check status (no protection needed)
router.get('/status', getReferralStatus);

// Apply admin protection to all routes below this point
router.use(protect, authorize('admin'));

router.route('/')
    .get(getReferralCodes)
    .post(addReferralCode);

router.route('/:id')
    .delete(deleteReferralCode);

module.exports = router;
