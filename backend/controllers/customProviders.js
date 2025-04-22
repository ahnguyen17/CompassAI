const CustomProvider = require('../models/CustomProvider');
const CustomModel = require('../models/CustomModel'); // Needed for cascading delete logic via model hook
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all custom providers
// @route   GET /api/v1/customproviders
// @access  Private (Admin)
exports.getCustomProviders = asyncHandler(async (req, res, next) => {
    const providers = await CustomProvider.find().sort({ name: 1 }); // Sort alphabetically
    res.status(200).json({ success: true, count: providers.length, data: providers });
});

// @desc    Create new custom provider
// @route   POST /api/v1/customproviders
// @access  Private (Admin)
exports.createCustomProvider = asyncHandler(async (req, res, next) => {
    const { name } = req.body;

    if (!name) {
        return next(new ErrorResponse('Please provide a provider name', 400));
    }

    // Check if provider already exists (case-insensitive)
    const existingProvider = await CustomProvider.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (existingProvider) {
        return next(new ErrorResponse(`Provider with name '${name}' already exists`, 400));
    }

    const provider = await CustomProvider.create({ name });
    res.status(201).json({ success: true, data: provider });
});

// @desc    Delete custom provider
// @route   DELETE /api/v1/customproviders/:id
// @access  Private (Admin)
exports.deleteCustomProvider = asyncHandler(async (req, res, next) => {
    const provider = await CustomProvider.findById(req.params.id);

    if (!provider) {
        return next(new ErrorResponse(`Custom Provider not found with id of ${req.params.id}`, 404));
    }

    // Check if user is admin (assuming middleware adds user role)
    // if (req.user.role !== 'admin') {
    //     return next(new ErrorResponse(`User ${req.user.id} is not authorized to delete this provider`, 401));
    // }

    // Use the remove() method to trigger the 'pre remove' hook in the model
    await provider.remove(); 

    res.status(200).json({ success: true, data: {} }); // Return empty object on successful delete
});

// Note: Update functionality is not required per the plan, but could be added here if needed.
// exports.updateCustomProvider = asyncHandler(async (req, res, next) => { ... });
