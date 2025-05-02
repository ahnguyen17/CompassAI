const ChatMessage = require('../models/ChatMessage');
const ChatSession = require('../models/ChatSession');
const User = require('../models/User');
const mongoose = require('mongoose');

// @desc    Get monthly usage statistics per user (total count)
// @route   GET /api/v1/stats/usage/user/monthly
// @access  Private/Admin
exports.getMonthlyUsageStats = async (req, res, next) => {
    try {
        const { year, month } = req.query;
        const matchConditions = {
            sender: 'ai',
            modelUsed: { $exists: true, $ne: null, $ne: "" }
        };

        // Add year and month filtering if provided
        if (year && month) {
            matchConditions.$expr = {
                $and: [
                    { $eq: [{ $year: '$timestamp' }, parseInt(year)] },
                    { $eq: [{ $month: '$timestamp' }, parseInt(month)] }
                ]
            };
        } else if (year) {
             matchConditions.$expr = { $eq: [{ $year: '$timestamp' }, parseInt(year)] };
        } else if (month) {
             matchConditions.$expr = { $eq: [{ $month: '$timestamp' }, parseInt(month)] };
        }


        const stats = await ChatMessage.aggregate([
            // 1. Filter for AI messages that used a model and apply year/month filter
            {
                $match: matchConditions
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
            { $unwind: '$sessionInfo' },
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
            { $unwind: '$userInfo' },
            // 6. Project necessary fields and extract year/month
            {
                $project: {
                    _id: 0,
                    year: { $year: '$timestamp' },
                    month: { $month: '$timestamp' },
                    userEmail: '$userInfo.email'
                }
            },
            // 7. Group by year, month, and user to count occurrences
            {
                $group: {
                    _id: {
                        year: '$year',
                        month: '$month',
                        user: '$userEmail'
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
                    count: '$count'
                }
            },
            // 9. Sort the results
            {
                $sort: {
                    year: -1,
                    month: -1,
                    user: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            count: stats.length,
            data: stats
        });
    } catch (error) {
        console.error("Get Monthly User Stats Error:", error);
        res.status(500).json({ success: false, error: 'Server Error fetching monthly user statistics' });
    }
};

// @desc    Get all-time usage statistics per user (total count)
// @route   GET /api/v1/stats/usage/user/alltime
// @access  Private/Admin
exports.getAllTimeUsageStats = async (req, res, next) => {
    try {
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
            { $unwind: '$sessionInfo' },
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
            { $unwind: '$userInfo' },
            // 6. Project necessary fields
            {
                $project: {
                    _id: 0,
                    userEmail: '$userInfo.email'
                }
            },
            // 7. Group by user to count occurrences
            {
                $group: {
                    _id: {
                        user: '$userEmail'
                    },
                    count: { $sum: 1 }
                }
            },
            // 8. Project into a more readable format
            {
                $project: {
                    _id: 0,
                    user: '$_id.user',
                    count: '$count'
                }
            },
            // 9. Sort the results
            {
                $sort: {
                    user: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            count: stats.length,
            data: stats
        });
    } catch (error) {
        console.error("Get All-Time User Stats Error:", error);
        res.status(500).json({ success: false, error: 'Server Error fetching all-time user statistics' });
    }
};

// @desc    Get monthly usage statistics per model (total count)
// @route   GET /api/v1/stats/usage/model/monthly
// @access  Private/Admin
exports.getMonthlyModelStats = async (req, res, next) => {
    try {
        const { year, month } = req.query;
         const matchConditions = {
            sender: 'ai',
            modelUsed: { $exists: true, $ne: null, $ne: "" }
        };

        // Add year and month filtering if provided
        if (year && month) {
            matchConditions.$expr = {
                $and: [
                    { $eq: [{ $year: '$timestamp' }, parseInt(year)] },
                    { $eq: [{ $month: '$timestamp' }, parseInt(month)] }
                ]
            };
        } else if (year) {
             matchConditions.$expr = { $eq: [{ $year: '$timestamp' }, parseInt(year)] };
        } else if (month) {
             matchConditions.$expr = { $eq: [{ $month: '$timestamp' }, parseInt(month)] };
        }

        const stats = await ChatMessage.aggregate([
            // 1. Filter for AI messages that used a model and apply year/month filter
            {
                $match: matchConditions
            },
            // 2. Project necessary fields and extract year/month *before* lookup
            {
                $project: {
                    _id: 0,
                    year: { $year: '$timestamp' },
                    month: { $month: '$timestamp' },
                    modelUsed: '$modelUsed' // Keep original modelUsed for lookup
                }
            },
            // 3. Check if modelUsed is a valid ObjectId (for custom models)
            {
                $addFields: {
                    isCustomModelId: {
                        $cond: {
                            if: { $regexMatch: { input: "$modelUsed", regex: /^[0-9a-fA-F]{24}$/ } },
                            then: { $toObjectId: "$modelUsed" },
                            else: null
                        }
                    }
                }
            },
            // 4. Lookup the custom model if modelUsed is a valid ObjectId
            {
                $lookup: {
                    from: 'custommodels',
                    localField: 'isCustomModelId',
                    foreignField: '_id',
                    as: 'customModelInfo'
                }
            },
            // 5. Deconstruct the customModelInfo array
            { $unwind: { path: '$customModelInfo', preserveNullAndEmptyArrays: true } }, // preserveNullAndEmptyArrays to keep messages without a custom model match
            // 6. Group by year, month, and model (using custom name if available) to count occurrences
            {
                $group: {
                    _id: {
                        year: '$year',
                        month: '$month',
                        model: {
                            $cond: {
                                if: '$customModelInfo', // Check if customModelInfo exists (meaning a custom model was found)
                                then: '$customModelInfo.name', // Use custom model name
                                else: '$modelUsed' // Otherwise use the original modelUsed value (base model identifier)
                            }
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            // 7. Project into a more readable format
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    model: '$_id.model',
                    count: '$count'
                }
            },
            // 8. Sort the results
            {
                $sort: {
                    year: -1,
                    month: -1,
                    model: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            count: stats.length,
            data: stats
        });
    } catch (error) {
        console.error("Get Monthly Model Stats Error:", error);
        res.status(500).json({ success: false, error: 'Server Error fetching monthly model statistics' });
    }
};

// @desc    Get all-time usage statistics per model (total count)
// @route   GET /api/v1/stats/usage/model/alltime
// @access  Private/Admin
exports.getAllTimeModelStats = async (req, res, next) => {
    try {
        const stats = await ChatMessage.aggregate([
            // 1. Filter for AI messages that used a model
            {
                $match: {
                    sender: 'ai',
                    modelUsed: { $exists: true, $ne: null, $ne: "" }
                }
            },
            // 2. Check if modelUsed is a valid ObjectId (for custom models)
            {
                $addFields: {
                    isCustomModelId: {
                        $cond: {
                            if: { $regexMatch: { input: "$modelUsed", regex: /^[0-9a-fA-F]{24}$/ } },
                            then: { $toObjectId: "$modelUsed" },
                            else: null
                        }
                    }
                }
            },
            // 3. Lookup the custom model if modelUsed is a valid ObjectId
            {
                $lookup: {
                    from: 'custommodels',
                    localField: 'isCustomModelId',
                    foreignField: '_id',
                    as: 'customModelInfo'
                }
            },
            // 4. Deconstruct the customModelInfo array
            { $unwind: { path: '$customModelInfo', preserveNullAndEmptyArrays: true } }, // preserveNullAndEmptyArrays to keep messages without a custom model match
            // 5. Project necessary fields, using custom model name if available
            {
                $project: {
                    _id: 0,
                    model: {
                        $cond: {
                            if: '$customModelInfo', // Check if customModelInfo exists
                            then: '$customModelInfo.name', // Use custom model name
                            else: '$modelUsed' // Otherwise use the original modelUsed value
                        }
                    }
                }
            },
            // 6. Group by model to count occurrences
            {
                $group: {
                    _id: {
                        model: '$model'
                    },
                    count: { $sum: 1 }
                }
            },
            // 7. Project into a more readable format
            {
                $project: {
                    _id: 0,
                    model: '$_id.model',
                    count: '$count'
                }
            },
            // 8. Sort the results
            {
                $sort: {
                    model: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            count: stats.length,
            data: stats
        });
    } catch (error) {
        console.error("Get All-Time Model Stats Error:", error);
        res.status(500).json({ success: false, error: 'Server Error fetching all-time model statistics' });
    }
};
