const asyncHandler = require('../middleware/async'); // Assuming you have an asyncHandler middleware
const ErrorResponse = require('../utils/errorResponse'); // Assuming you have an ErrorResponse utility
const ChatMessage = require('../models/ChatMessage');
const ChatSession = require('../models/ChatSession');
const User = require('../models/User');
const mongoose = require('mongoose');

// @desc    Get monthly usage statistics per user and model
// @route   GET /api/stats/usage/monthly
// @access  Private/Admin
exports.getMonthlyUsageStats = asyncHandler(async (req, res, next) => {
    const stats = await ChatMessage.aggregate([
        // 1. Filter for AI messages that used a model
        {
            $match: {
                sender: 'ai',
                modelUsed: { $exists: true, $ne: null, $ne: "" }
            }
        },
        // 2. Lookup the session to get the user ID
        {
            $lookup: {
                from: 'chatsessions', // The actual collection name for ChatSession model
                localField: 'session',
                foreignField: '_id',
                as: 'sessionInfo'
            }
        },
        // 3. Unwind the sessionInfo array (should only have one element)
        {
            $unwind: '$sessionInfo'
        },
        // 4. Lookup the user to get their details (e.g., email)
        {
            $lookup: {
                from: 'users', // The actual collection name for User model
                localField: 'sessionInfo.user',
                foreignField: '_id',
                as: 'userInfo'
            }
        },
        // 5. Unwind the userInfo array
        {
            $unwind: '$userInfo'
        },
        // 6. Project necessary fields and extract year/month
        {
            $project: {
                _id: 0, // Exclude default _id
                year: { $year: '$timestamp' },
                month: { $month: '$timestamp' },
                userEmail: '$userInfo.email', // Use email as identifier
                model: '$modelUsed'
            }
        },
        // 7. Group by year, month, user, and model to count occurrences
        {
            $group: {
                _id: {
                    year: '$year',
                    month: '$month',
                    user: '$userEmail',
                    model: '$model'
                },
                count: { $sum: 1 }
            }
        },
        // 8. Project into a more readable format
        {
            $project: {
                _id: 0,
                year: '$_id.year',
                month: '$_id.month',
                user: '$_id.user',
                model: '$_id.model',
                count: '$count'
            }
        },
        // 9. Sort the results (optional but good for consistency)
        {
            $sort: {
                year: -1, // Sort by year descending
                month: -1, // Then by month descending
                user: 1,   // Then by user ascending
                model: 1   // Then by model ascending
            }
        }
    ]);

    res.status(200).json({
        success: true,
        count: stats.length,
        data: stats
    });
});

// @desc    Get all-time usage statistics per user and model
// @route   GET /api/stats/usage/alltime
// @access  Private/Admin
exports.getAllTimeUsageStats = asyncHandler(async (req, res, next) => {
    const stats = await ChatMessage.aggregate([
        // 1. Filter for AI messages that used a model
        {
            $match: {
                sender: 'ai',
                modelUsed: { $exists: true, $ne: null, $ne: "" }
            }
        },
        // 2. Lookup the session to get the user ID
        {
            $lookup: {
                from: 'chatsessions',
                localField: 'session',
                foreignField: '_id',
                as: 'sessionInfo'
            }
        },
        // 3. Unwind the sessionInfo array
        {
            $unwind: '$sessionInfo'
        },
        // 4. Lookup the user to get their details
        {
            $lookup: {
                from: 'users',
                localField: 'sessionInfo.user',
                foreignField: '_id',
                as: 'userInfo'
            }
        },
        // 5. Unwind the userInfo array
        {
            $unwind: '$userInfo'
        },
        // 6. Project necessary fields
        {
            $project: {
                _id: 0,
                userEmail: '$userInfo.email',
                model: '$modelUsed'
            }
        },
        // 7. Group by user and model to count occurrences
        {
            $group: {
                _id: {
                    user: '$userEmail',
                    model: '$model'
                },
                count: { $sum: 1 }
            }
        },
        // 8. Project into a more readable format
        {
            $project: {
                _id: 0,
                user: '$_id.user',
                model: '$_id.model',
                count: '$count'
            }
        },
        // 9. Sort the results
        {
            $sort: {
                user: 1,
                model: 1
            }
        }
    ]);

    res.status(200).json({
        success: true,
        count: stats.length,
        data: stats
    });
});
