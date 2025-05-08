const ApiKey = require('../models/ApiKey');
const DisabledModel = require('../models/DisabledModel'); // Import the DisabledModel model

// Hardcoded list of common models per provider, now including vision support flag
// In a real application, you might fetch this dynamically if APIs allow
const AVAILABLE_MODELS = {
    'Anthropic': [
        { name: "claude-3-opus-20240229", supportsVision: true },
        { name: "claude-3-sonnet-20240229", supportsVision: true },
        { name: "claude-3-haiku-20240307", supportsVision: true },
        { name: "claude-2.1", supportsVision: false }, // Re-added (Deprecated)
        { name: "claude-2.0", supportsVision: false }, // Re-added (Deprecated)
        { name: "claude-instant-1.2", supportsVision: false } // Re-added (Deprecated)
    ],
    'OpenAI': [
        { name: "gpt-4o", supportsVision: true }, // Flagged vision
        { name: "gpt-4-turbo", supportsVision: true }, // Flagged vision
        { name: "gpt-4", supportsVision: false }, // Older GPT-4 likely doesn't have vision API access easily
        { name: "gpt-3.5-turbo", supportsVision: false },
        { name: "gpt-4.1", supportsVision: true }, // Updated - Vision confirmed
        { name: "gpt-4.1-mini", supportsVision: true }, // Updated - Vision confirmed
        { name: "gpt-4.1-nano", supportsVision: true }, // Updated - Vision confirmed
        { name: "o3-mini", supportsVision: false } // Added per user request - Assuming no vision
    ],
    'Gemini': [
        // Note: Verify official API identifiers before use
        { name: "gemini-1.5-pro-latest", supportsVision: true }, // Flagged vision
        { name: "gemini-1.5-flash-latest", supportsVision: true }, // Flagged vision
        { name: "gemini-1.5-pro", supportsVision: true }, // Assuming 1.5 Pro also supports vision
        { name: "gemini-1.0-pro", supportsVision: false }, // 1.0 Pro likely doesn't support vision API easily
        // Added experimental/other models - Assuming no vision for now unless confirmed
        { name: "gemini-2.5-pro-experimental", supportsVision: false },
        { name: "gemini-2.0-flash", supportsVision: false },
        { name: "gemini-2.0-flash-lite", supportsVision: false },
        { name: "gemini-1.5-flash-8b", supportsVision: false }, // Size specifiers unusual
    ],
     'DeepSeek': [ // No vision support confirmed
         { name: "deepseek-chat", supportsVision: false },
         { name: "deepseek-coder", supportsVision: false },
         { name: "deepseek-reasoner", supportsVision: false }
     ],
     'Perplexity': [ // Vision support via API unclear for specific models
        { name: "perplexity/sonar-deep-research", supportsVision: false }, // Assume false for now
        { name: "perplexity/sonar-reasoning-pro", supportsVision: false }, // Assume false for now
        { name: "perplexity/sonar-reasoning", supportsVision: false }, // Assume false for now
        { name: "perplexity/sonar-pro", supportsVision: false }, // Assume false for now
        { name: "perplexity/sonar", supportsVision: false }, // Assume false for now
        { name: "perplexity/r1-1776", supportsVision: false } // Assume false for now
    ]
};

// Export the constant for use in other controllers (e.g., customModels)
// Note: Consumers of this export will need to handle the new object structure
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
                // Filter out disabled models for this provider (checking model.name)
                const providerModels = AVAILABLE_MODELS[provider].filter(
                    model => !disabledModelNamesSet.has(model.name)
                );
                // Only include provider if they have at least one enabled model
                if (providerModels.length > 0) {
                    // Return the array of model objects for the provider
                    filteredBaseModels[provider] = providerModels;
                }
            }
        }

        // --- Process Custom Models ---
        // Custom models don't inherently support vision unless their base model does,
        // but we don't need to add the flag here as the frontend only needs the list.
        // The backend controller (chatMessages) will check the base model's capability.
        // Format custom models for the response - structure remains the same
        const formattedCustomModels = customModelsList.map(model => ({
            _id: model._id,
            name: model.name,
            providerName: model.provider?.name || 'Unknown Provider', // Use populated provider name
            baseModelIdentifier: model.baseModelIdentifier
            // Do not include systemPrompt here for security/privacy
        }));

        // --- Combine Results ---
        // The response structure remains the same, but baseModels now contains arrays of objects
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
