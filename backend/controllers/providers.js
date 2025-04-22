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
        "gpt-4.1", // Added
        "gpt-4.1-mini", // Added
        "gpt-4.1-nano", // Added
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

// Export the constant for use in other controllers (e.g., customModels)
exports.AVAILABLE_MODELS = AVAILABLE_MODELS;

// @desc    Get available models for enabled providers
const CustomModel = require('../models/CustomModel'); // Import CustomModel

// @route   GET /api/v1/providers/models
// @access  Private
exports.getAvailableModels = async (req, res, next) => {
    try {
        // Fetch enabled API keys, disabled model names, and all custom models concurrently
        const [enabledKeys, disabledModelsList, customModelsList] = await Promise.all([
            ApiKey.find({ isEnabled: true }).select('providerName'),
            DisabledModel.find().select('modelName'),
            CustomModel.find().populate({ path: 'provider', select: 'name' }).sort({ name: 1 }) // Fetch all custom models and populate provider name
        ]);

        // --- Process Base Models ---
        const enabledProviders = enabledKeys.map(key => key.providerName);
        const disabledModelNamesSet = new Set(disabledModelsList.map(m => m.modelName));

        const filteredBaseModels = {};
        for (const provider of enabledProviders) {
            if (AVAILABLE_MODELS[provider]) {
                // Filter out disabled models for this provider
                const providerModels = AVAILABLE_MODELS[provider].filter(
                    modelName => !disabledModelNamesSet.has(modelName)
                );
                // Only include provider if they have at least one enabled model
                if (providerModels.length > 0) {
                    filteredBaseModels[provider] = providerModels;
                }
            }
        }

        // --- Process Custom Models ---
        // Format custom models for the response
        const formattedCustomModels = customModelsList.map(model => ({
            _id: model._id,
            name: model.name,
            providerName: model.provider?.name || 'Unknown Provider', // Use populated provider name
            baseModelIdentifier: model.baseModelIdentifier
            // Do not include systemPrompt here for security/privacy
        }));

        // --- Combine Results ---
        const responseData = {
            baseModels: filteredBaseModels,
            customModels: formattedCustomModels
        };

        res.status(200).json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error("Error fetching available models (including custom):", error);
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
