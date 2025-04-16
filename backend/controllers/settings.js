const Setting = require('../models/Setting');
const asyncHandler = require('./../middleware/async'); // Corrected path
const ErrorResponse = require('./../utils/errorResponse'); // Corrected path

// @desc    Get global settings
// @route   GET /api/settings
// @access  Private (Admins might need this, but potentially users too depending on future settings)
exports.getSettings = asyncHandler(async (req, res, next) => {
  const settings = await Setting.getSettings(); // Use the static method to ensure defaults exist

  res.status(200).json({
    success: true,
    data: settings,
  });
});

// @desc    Update global settings
// @route   PUT /api/settings
// @access  Private (Admin Only)
exports.updateSettings = asyncHandler(async (req, res, next) => {
  // Ensure only admins can update settings (this should also be enforced by route middleware)
  if (req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to update settings', 403));
  }

  const { globalStreamingEnabled } = req.body;

  // Find the settings document (should always exist due to getSettings logic)
  let settings = await Setting.findOne({ key: 'globalSettings' });

  if (!settings) {
    // This case should ideally not happen if getSettings is called elsewhere or upon startup
    console.error('CRITICAL: Global settings document not found during update attempt.');
    settings = await Setting.create({ key: 'globalSettings', globalStreamingEnabled });
  } else {
    // Update the specific setting if provided in the request body
    if (typeof globalStreamingEnabled === 'boolean') {
      settings.globalStreamingEnabled = globalStreamingEnabled;
    }
    // Add updates for other settings here in the future
    // e.g., if (req.body.someOtherSetting !== undefined) settings.someOtherSetting = req.body.someOtherSetting;

    await settings.save();
  }

  res.status(200).json({
    success: true,
    data: settings,
  });
});
