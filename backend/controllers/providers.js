const ApiKey = require('../models/ApiKey');

// Hardcoded list of common models per provider
// In a real application, you might fetch this dynamically if APIs allow
const AVAILABLE_MODELS = {
    'Anthropic': [
        "claude-3-opus-20240229",
        "claude-3-sonnet-20240229",
        "claude-3-haiku-20240307",
        "claude-2.1", // Re-added (Deprecated)
        "claude-2.0", // Re-added (Deprecated)
        "claude-instant-1.2" // Re-added (Deprecated)
    ],
    'OpenAI': [
        "gpt-4",
        "gpt-4-turbo",
        "gpt-4o",
        "gpt-3.5-turbo"
    ],
    'Gemini': [
        // Note: Verify official API identifiers before use
        "gemini-2.5-pro-experimental", // Added per request
        "gemini-2.0-flash",            // Added per request
        "gemini-2.0-flash-lite",       // Added per request
        "gemini-1.5-pro-latest",
        "gemini-1.5-pro",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash-8b",         // Added per request (Note: Size specifiers usually aren't in model names)
        "gemini-1.0-pro",
    ],
    // Add DeepSeek models here if implementing
};

// @desc    Get available models for enabled providers
// @route   GET /api/v1/providers/models
// @access  Private
exports.getAvailableModels = async (req, res, next) => {
    try {
        const enabledKeys = await ApiKey.find({ isEnabled: true }).select('providerName');
        const enabledProviders = enabledKeys.map(key => key.providerName);

        const availableModels = {};
        for (const provider of enabledProviders) {
            if (AVAILABLE_MODELS[provider]) {
                availableModels[provider] = AVAILABLE_MODELS[provider];
            }
        }

        res.status(200).json({
            success: true,
            data: availableModels
        });

    } catch (error) {
        console.error("Error fetching available models:", error);
        res.status(500).json({ success: false, error: 'Server Error fetching models' });
    }
};
