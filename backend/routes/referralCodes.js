const express = require('express');
const {
    getReferralCodes,
    addReferralCode,
    deleteReferralCode
} = require('../controllers/referralCodes');

const router = express.Router();

// Import middleware
const { protect, authorize } = require('../middleware/auth');

// Apply admin protection to all these routes
router.use(protect, authorize('admin'));

router.route('/')
    .get(getReferralCodes)
    .post(addReferralCode);

router.route('/:id')
    .delete(deleteReferralCode);

module.exports = router;
