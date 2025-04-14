const express = require('express');
const {
    getMonthlyUsageStats,
    getAllTimeUsageStats,
    getMonthlyModelStats, // Added import
    getAllTimeModelStats  // Added import
} = require('../controllers/stats');

// Include middleware
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes below are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

// Define routes for User Stats
router.route('/usage/user/monthly') // Updated path
    .get(getMonthlyUsageStats);

router.route('/usage/user/alltime') // Updated path
    .get(getAllTimeUsageStats);

// Define routes for Model Stats
router.route('/usage/model/monthly') // New route
    .get(getMonthlyModelStats);

router.route('/usage/model/alltime') // New route
    .get(getAllTimeModelStats);

module.exports = router;
