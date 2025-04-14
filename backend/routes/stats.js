const express = require('express');
const {
    getMonthlyUsageStats,
    getAllTimeUsageStats
} = require('../controllers/stats');

// Include middleware
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes below are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

// Define routes
router.route('/usage/monthly')
    .get(getMonthlyUsageStats);

router.route('/usage/alltime')
    .get(getAllTimeUsageStats);

module.exports = router;
