const ApiKey = require('../models/ApiKey');
// Add error handling utilities later if needed

// @desc    Get all API keys
// @route   GET /api/v1/apikeys
// @access  Private (Requires login, potentially admin later)
exports.getApiKeys = async (req, res, next) => {
  try {
    // TODO: Add authorization check (e.g., only allow admins) if needed
    // if (req.user.role !== 'admin') {
    //   return res.status(403).json({ success: false, error: 'User not authorized' });
    // }

    const apiKeys = await ApiKey.find(); // Consider filtering or pagination for many keys

    res.status(200).json({
      success: true,
      count: apiKeys.length,
      data: apiKeys,
    });
  } catch (error) {
    console.error("Get API Keys Error:", error);
    res.status(500).json({ success: false, error: 'Server Error fetching API keys' });
  }
};

// @desc    Add a new API key
// @route   POST /api/v1/apikeys
// @access  Private (Requires login, potentially admin later)
exports.addApiKey = async (req, res, next) => {
  try {
    // TODO: Add authorization check (e.g., only allow admins)

    const { providerName, keyValue } = req.body;

    if (!providerName || !keyValue) {
      return res.status(400).json({ success: false, error: 'Please provide providerName and keyValue' });
    }

    // Check if key for this provider already exists
    let existingKey = await ApiKey.findOne({ providerName });
    if (existingKey) {
        return res.status(400).json({ success: false, error: `API key for ${providerName} already exists.` });
    }

    const apiKey = await ApiKey.create({ providerName, keyValue });

    res.status(201).json({
      success: true,
      data: apiKey,
    });
  } catch (error) {
    console.error("Add API Key Error:", error);
     if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ success: false, error: messages });
    }
    res.status(500).json({ success: false, error: 'Server Error adding API key' });
  }
};

// @desc    Update an API key (e.g., enable/disable, change value)
// @route   PUT /api/v1/apikeys/:id
// @access  Private (Requires login, potentially admin later)
exports.updateApiKey = async (req, res, next) => {
  try {
    // TODO: Add authorization check

    const apiKey = await ApiKey.findById(req.params.id);

    if (!apiKey) {
      return res.status(404).json({ success: false, error: `API key not found with id ${req.params.id}` });
    }

    // Allow updating keyValue, isEnabled, and priority
    const { keyValue, isEnabled, priority } = req.body;
    const updateData = {};
    if (keyValue !== undefined) updateData.keyValue = keyValue; // Allow updating the key value itself
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
    if (priority !== undefined && typeof priority === 'number' && priority >= 1) { // Basic validation for priority
         updateData.priority = priority;
    }
    // Prevent changing providerName via update

    const updatedApiKey = await ApiKey.findByIdAndUpdate(req.params.id, updateData, {
      new: true, // Return the modified document
      runValidators: true, // Run schema validators on update
    });

    res.status(200).json({
      success: true,
      data: updatedApiKey,
    });
  } catch (error) {
    console.error("Update API Key Error:", error);
     if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ success: false, error: messages });
    }
     if (error.name === 'CastError') {
         return res.status(404).json({ success: false, error: `API key not found with id ${req.params.id}` });
     }
    res.status(500).json({ success: false, error: 'Server Error updating API key' });
  }
};

// @desc    Delete an API key
// @route   DELETE /api/v1/apikeys/:id
// @access  Private (Requires login, potentially admin later)
exports.deleteApiKey = async (req, res, next) => {
  try {
    // TODO: Add authorization check

    const apiKey = await ApiKey.findById(req.params.id);

    if (!apiKey) {
      return res.status(404).json({ success: false, error: `API key not found with id ${req.params.id}` });
    }

    await apiKey.deleteOne(); // Use deleteOne() on the document

    res.status(200).json({
      success: true,
      data: {}, // Indicate successful deletion
    });
  } catch (error) {
    console.error("Delete API Key Error:", error);
     if (error.name === 'CastError') {
         return res.status(404).json({ success: false, error: `API key not found with id ${req.params.id}` });
     }
    res.status(500).json({ success: false, error: 'Server Error deleting API key' });
  }
};
