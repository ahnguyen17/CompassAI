const CustomModel = require('../models/CustomModel');
const CustomProvider = require('../models/CustomProvider'); // Needed for validation
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { AVAILABLE_MODELS } = require('./providers'); // Import the hardcoded base models

// Helper function to validate baseModelIdentifier
const isValidBaseModel = (identifier) => {
    for (const provider in AVAILABLE_MODELS) {
        if (AVAILABLE_MODELS[provider].includes(identifier)) {
            return true;
        }
    }
    return false;
};

// @desc    Get all custom models, optionally filtered by provider
// @route   GET /api/v1/custommodels
// @route   GET /api/v1/customproviders/:providerId/custommodels 
// @access  Private (Admin)
exports.getCustomModels = asyncHandler(async (req, res, next) => {
    let query;

    if (req.params.providerId) {
        // Check if the provider exists
        const provider = await CustomProvider.findById(req.params.providerId);
        if (!provider) {
            return next(new ErrorResponse(`Custom Provider not found with id ${req.params.providerId}`, 404));
        }
        query = CustomModel.find({ provider: req.params.providerId }).populate({
            path: 'provider',
            select: 'name' // Populate provider name for context
        });
    } else {
        query = CustomModel.find().populate({
            path: 'provider',
            select: 'name' // Populate provider name for context
        });
    }

    const models = await query.sort({ name: 1 }); // Sort alphabetically by name

    res.status(200).json({
        success: true,
        count: models.length,
        data: models
    });
});

// @desc    Get single custom model
// @route   GET /api/v1/custommodels/:id
// @access  Private (Admin)
exports.getCustomModel = asyncHandler(async (req, res, next) => {
    const model = await CustomModel.findById(req.params.id).populate({
        path: 'provider',
        select: 'name'
    });

    if (!model) {
        return next(new ErrorResponse(`Custom Model not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({ success: true, data: model });
});

// @desc    Create new custom model
// @route   POST /api/v1/custommodels
// @access  Private (Admin)
exports.createCustomModel = asyncHandler(async (req, res, next) => {
    const { name, provider, baseModelIdentifier, systemPrompt } = req.body;

    // Basic validation
    if (!name || !provider || !baseModelIdentifier) {
        return next(new ErrorResponse('Please provide name, provider ID, and baseModelIdentifier', 400));
    }

    // Validate provider exists
    const providerDoc = await CustomProvider.findById(provider);
    if (!providerDoc) {
        return next(new ErrorResponse(`Custom Provider not found with id ${provider}`, 404));
    }

    // Validate baseModelIdentifier exists in AVAILABLE_MODELS
    if (!isValidBaseModel(baseModelIdentifier)) {
        return next(new ErrorResponse(`Invalid baseModelIdentifier: '${baseModelIdentifier}'. It does not exist in the available base models.`, 400));
    }

    const customModel = await CustomModel.create({
        name,
        provider,
        baseModelIdentifier,
        systemPrompt
    });

    // Populate provider name before sending response
    const populatedModel = await CustomModel.findById(customModel._id).populate({
        path: 'provider',
        select: 'name'
    });


    res.status(201).json({ success: true, data: populatedModel });
});

// @desc    Update custom model
// @route   PUT /api/v1/custommodels/:id
// @access  Private (Admin)
exports.updateCustomModel = asyncHandler(async (req, res, next) => {
    let model = await CustomModel.findById(req.params.id);

    if (!model) {
        return next(new ErrorResponse(`Custom Model not found with id of ${req.params.id}`, 404));
    }

    // Validate baseModelIdentifier if provided
    if (req.body.baseModelIdentifier && !isValidBaseModel(req.body.baseModelIdentifier)) {
         return next(new ErrorResponse(`Invalid baseModelIdentifier: '${req.body.baseModelIdentifier}'. It does not exist in the available base models.`, 400));
    }
    
    // Validate provider if provided
    if (req.body.provider) {
        const providerDoc = await CustomProvider.findById(req.body.provider);
         if (!providerDoc) {
            return next(new ErrorResponse(`Custom Provider not found with id ${req.body.provider}`, 404));
        }
    }

    // Fields allowed to be updated
    const fieldsToUpdate = {
        name: req.body.name,
        provider: req.body.provider,
        baseModelIdentifier: req.body.baseModelIdentifier,
        systemPrompt: req.body.systemPrompt
    };

    // Remove undefined fields so they don't overwrite existing data
    Object.keys(fieldsToUpdate).forEach(key => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]);

    model = await CustomModel.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
        new: true, // Return the modified document
        runValidators: true // Run schema validators on update
    }).populate({
        path: 'provider',
        select: 'name'
    });

    res.status(200).json({ success: true, data: model });
});

// @desc    Delete custom model
// @route   DELETE /api/v1/custommodels/:id
// @access  Private (Admin)
exports.deleteCustomModel = asyncHandler(async (req, res, next) => {
    const model = await CustomModel.findById(req.params.id);

    if (!model) {
        return next(new ErrorResponse(`Custom Model not found with id of ${req.params.id}`, 404));
    }

    await model.remove(); // Use remove() instead of findByIdAndDelete

    res.status(200).json({ success: true, data: {} });
});
