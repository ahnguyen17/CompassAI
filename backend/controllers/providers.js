const ApiKey = require('../models/ApiKey');
const DisabledModel = require('../models/DisabledModel'); // Import the DisabledModel model

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
        "gpt-3.5-turbo",
        "o3-mini" // Added per user request
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
     'DeepSeek': [ // Added DeepSeek
         "deepseek-chat",
         "deepseek-coder",
         "deepseek-reasoner" // Added new model
         // Removed "DeepSeek-V3"
     ],
     'Perplexity': [ // Added Perplexity with prefix
        "perplexity/sonar-deep-research",
        "perplexity/sonar-reasoning-pro",
        "perplexity/sonar-reasoning",
        "perplexity/sonar-pro",
        "perplexity/sonar",
        "perplexity/r1-1776"
    ]
};

// @desc    Get available models for enabled providers
// @route   GET /api/v1/providers/models
// @access  Private
exports.getAvailableModels = async (req, res, next) => {
    try {
        // Fetch enabled API keys and disabled model names concurrently
        const [enabledKeys, disabledModels] = await Promise.all([
            ApiKey.find({ isEnabled: true }).select('providerName'),
            DisabledModel.find().select('modelName')
        ]);

        const enabledProviders = enabledKeys.map(key => key.providerName);
        const disabledModelNamesSet = new Set(disabledModels.map(m => m.modelName));

        const availableModels = {};
        for (const provider of enabledProviders) {
            if (AVAILABLE_MODELS[provider]) {
                // Filter out disabled models for this provider
                availableModels[provider] = AVAILABLE_MODELS[provider].filter(
                    modelName => !disabledModelNamesSet.has(modelName)
                );
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

// @desc    Get ALL potentially available models (unfiltered)
// @route   GET /api/v1/providers/all-models
// @access  Private 
// This sends the raw hardcoded list, used for settings page model visibility toggles
exports.getAllModels = async (req, res, next) => {
    try {
        // Simply return the hardcoded constant
        res.status(200).json({
            success: true,
            data: AVAILABLE_MODELS 
        });
    } catch (error) {
        console.error("Error fetching all models:", error);
        res.status(500).json({ success: false, error: 'Server Error fetching all models' });
    }
};
