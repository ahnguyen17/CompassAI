const DisabledModel = require('../models/DisabledModel');

// Use the same hardcoded list as providers.js
const AVAILABLE_MODELS = {
    'Anthropic': [
        "claude-3-opus-20240229",
        "claude-3-sonnet-20240229",
        "claude-3-haiku-20240307",
        "claude-2.1",
        "claude-2.0",
        "claude-instant-1.2"
    ],
    'OpenAI': [
        "gpt-4",
        "gpt-4-turbo",
        "gpt-4o",
        "gpt-3.5-turbo"
    ],
    'Gemini': [
        "gemini-2.5-pro-experimental",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-1.5-pro-latest",
        "gemini-1.5-pro",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash-8b",
        "gemini-1.0-pro",
    ],
    'DeepSeek': [ // Added DeepSeek
        "deepseek-chat",
        "deepseek-coder"
    ]
};

// @desc    Get all disabled model names
// @route   GET /api/v1/disabledmodels
// @access  Private/Admin
exports.getDisabledModels = async (req, res, next) => {
  try {
    const disabled = await DisabledModel.find();
    const disabledModelNames = disabled.map(m => m.modelName);
    res.status(200).json({ success: true, data: disabledModelNames });
  } catch (error) {
    console.error("Get Disabled Models Error:", error);
    res.status(500).json({ success: false, error: 'Server Error fetching disabled models' });
  }
};

// @desc    Get all available models and their disabled status
// @route   GET /api/v1/disabledmodels/status
// @access  Private/Admin
exports.getAllModelsStatus = async (req, res, next) => {
    try {
        // Get all model names from the hardcoded list
        const allAvailableModels = Object.values(AVAILABLE_MODELS).flat();
        const disabled = await DisabledModel.find();
        const disabledModelNamesSet = new Set(disabled.map(m => m.modelName));

        const modelStatuses = allAvailableModels.map(modelName => ({
            modelName: modelName,
            isDisabled: disabledModelNamesSet.has(modelName)
        }));

        res.status(200).json({ success: true, data: modelStatuses });
    } catch (error) {
        console.error("Get All Models Status Error:", error);
        res.status(500).json({ success: false, error: 'Server Error fetching model statuses' });
    }
};


// @desc    Disable a model (add to list)
// @route   POST /api/v1/disabledmodels
// @access  Private/Admin
exports.disableModel = async (req, res, next) => {
  try {
    const { modelName } = req.body;
    if (!modelName) {
      return res.status(400).json({ success: false, error: 'Please provide a model name' });
    }

    // Check if already disabled
    const existing = await DisabledModel.findOne({ modelName });
    if (existing) {
      return res.status(400).json({ success: false, error: `Model '${modelName}' is already disabled` });
    }

    await DisabledModel.create({ modelName });
    res.status(201).json({ success: true, data: { modelName } }); // Return the disabled model name

  } catch (error) {
    console.error("Disable Model Error:", error);
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ success: false, error: messages });
    }
    res.status(500).json({ success: false, error: 'Server Error disabling model' });
  }
};

// @desc    Enable a model (remove from list)
// @route   DELETE /api/v1/disabledmodels/:modelName
// @access  Private/Admin
exports.enableModel = async (req, res, next) => {
  try {
    const modelName = req.params.modelName; // Get model name from URL parameter

    const disabledModel = await DisabledModel.findOne({ modelName: modelName });

    if (!disabledModel) {
      return res.status(404).json({ success: false, error: `Model '${modelName}' not found in disabled list` });
    }

    await disabledModel.deleteOne();

    res.status(200).json({ success: true, data: {} }); // Indicate success
  } catch (error) {
    console.error("Enable Model Error:", error);
    res.status(500).json({ success: false, error: 'Server Error enabling model' });
  }
};
