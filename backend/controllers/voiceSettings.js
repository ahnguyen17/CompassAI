const ApiKey = require('../models/ApiKey');

/**
 * @desc    Get user's voice API keys (Deepgram and OpenAI)
 * @route   GET /api/v1/aidoc/voice/settings/apikeys
 * @access  Private (any authenticated user)
 */
exports.getVoiceApiKeys = async (req, res) => {
    try {
        // Get Deepgram and OpenAI API keys
        const deepgramKey = await ApiKey.findOne({ 
            providerName: 'DEEPGRAM_API_KEY',
            isEnabled: true 
        });
        
        const openaiKey = await ApiKey.findOne({ 
            providerName: 'OpenAI',
            isEnabled: true 
        });

        // Return masked keys for security (only show last 4 characters)
        const maskApiKey = (key) => {
            if (!key) return null;
            const keyStr = key.toString();
            if (keyStr.length <= 4) return '****';
            return '****' + keyStr.slice(-4);
        };

        res.status(200).json({
            success: true,
            data: {
                deepgram: deepgramKey ? {
                    _id: deepgramKey._id,
                    providerName: deepgramKey.providerName,
                    keyValue: deepgramKey.keyValue, // Return full key for editing
                    isEnabled: deepgramKey.isEnabled,
                    maskedKey: maskApiKey(deepgramKey.keyValue)
                } : null,
                openai: openaiKey ? {
                    _id: openaiKey._id,
                    providerName: openaiKey.providerName,
                    keyValue: openaiKey.keyValue, // Return full key for editing
                    isEnabled: openaiKey.isEnabled,
                    maskedKey: maskApiKey(openaiKey.keyValue)
                } : null
            }
        });
    } catch (error) {
        console.error('Get Voice API Keys Error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server Error fetching voice API keys' 
        });
    }
};

/**
 * @desc    Save/Update user's voice API keys
 * @route   POST /api/v1/aidoc/voice/settings/apikeys
 * @access  Private (any authenticated user)
 */
exports.saveVoiceApiKeys = async (req, res) => {
    try {
        const { deepgramApiKey, openaiApiKey } = req.body;
        const results = { deepgram: null, openai: null };

        // Save/Update Deepgram API key
        if (deepgramApiKey && deepgramApiKey.trim()) {
            const existingDeepgram = await ApiKey.findOne({ 
                providerName: 'DEEPGRAM_API_KEY' 
            });

            if (existingDeepgram) {
                // Update existing key
                existingDeepgram.keyValue = deepgramApiKey.trim();
                existingDeepgram.isEnabled = true;
                existingDeepgram.lastUpdatedAt = Date.now();
                await existingDeepgram.save();
                results.deepgram = existingDeepgram;
            } else {
                // Create new key
                const newKey = await ApiKey.create({
                    providerName: 'DEEPGRAM_API_KEY',
                    keyValue: deepgramApiKey.trim(),
                    isEnabled: true
                });
                results.deepgram = newKey;
            }
        }

        // Save/Update OpenAI API key
        if (openaiApiKey && openaiApiKey.trim()) {
            const existingOpenAI = await ApiKey.findOne({ 
                providerName: 'OpenAI' 
            });

            if (existingOpenAI) {
                // Update existing key
                existingOpenAI.keyValue = openaiApiKey.trim();
                existingOpenAI.isEnabled = true;
                existingOpenAI.lastUpdatedAt = Date.now();
                await existingOpenAI.save();
                results.openai = existingOpenAI;
            } else {
                // Create new key
                const newKey = await ApiKey.create({
                    providerName: 'OpenAI',
                    keyValue: openaiApiKey.trim(),
                    isEnabled: true
                });
                results.openai = newKey;
            }
        }

        res.status(200).json({
            success: true,
            message: 'Voice API keys saved successfully',
            data: results
        });
    } catch (error) {
        console.error('Save Voice API Keys Error:', error);
        
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ 
                success: false, 
                error: messages.join(', ') 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: 'Server Error saving voice API keys' 
        });
    }
};

