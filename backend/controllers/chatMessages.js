// Import SDKs
const Anthropic = require('@anthropic-ai/sdk');
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const pdf = require('pdf-parse');

// Import Models
const ChatMessage = require('../models/ChatMessage');
const ChatSession = require('../models/ChatSession');
const ApiKey = require('../models/ApiKey');

// Define available models (Should match controllers/providers.js)
const AVAILABLE_MODELS = {
    'Anthropic': [
        "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307",
        "claude-2.1", "claude-2.0", "claude-instant-1.2" // Deprecated models re-added
    ],
    'OpenAI': ["gpt-4", "gpt-4-turbo", "gpt-4o", "gpt-3.5-turbo"],
    'Gemini': [
        "gemini-2.5-pro-experimental", "gemini-2.0-flash", "gemini-2.0-flash-lite",
        "gemini-1.5-pro-latest", "gemini-1.5-pro", "gemini-1.5-flash-latest",
        "gemini-1.5-flash-8b", "gemini-1.0-pro"
    ],
};

// Define default models per provider
const DEFAULT_MODELS = {
    'Anthropic': 'claude-3-haiku-20240307',
    'OpenAI': 'gpt-3.5-turbo',
    'Gemini': 'gemini-1.5-flash-latest'
};

// Helper function to find provider for a given model
const findProviderForModel = (modelName) => {
    for (const [provider, models] of Object.entries(AVAILABLE_MODELS)) {
        if (models.includes(modelName)) return provider;
    }
    return null;
};

// Helper function to make API call
const callApi = async (providerName, apiKey, modelToUse, history, combinedContentForAI) => {
    let aiResponseContent = null;
    const historyForProvider = history.map((msg, index) => {
        const messageContent = (index === history.length - 1 && msg.sender === 'user') ? combinedContentForAI : msg.content;
        if (providerName === 'Anthropic' || providerName === 'OpenAI') return { role: msg.sender === 'user' ? 'user' : 'assistant', content: messageContent };
        if (providerName === 'Gemini') return { role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: messageContent }] };
        return null;
    }).filter(Boolean);

    let formattedMessages = historyForProvider;
    if (providerName === 'Gemini') {
        if (formattedMessages.length > 0 && formattedMessages[0].role === 'model') formattedMessages.shift();
        formattedMessages = formattedMessages.filter((item, index, arr) => index === 0 || item.role !== arr[index - 1].role);
    }

    try {
        console.log(`Calling ${providerName} with model ${modelToUse}`);
        if (providerName === 'Anthropic') {
            const anthropic = new Anthropic({ apiKey });
            const msg = await anthropic.messages.create({ model: modelToUse, max_tokens: 1024, messages: formattedMessages });
            if (msg.content?.[0]?.type === 'text') aiResponseContent = msg.content[0].text;
        } else if (providerName === 'OpenAI') {
            const openai = new OpenAI({ apiKey });
            const completion = await openai.chat.completions.create({ model: modelToUse, messages: formattedMessages });
            if (completion.choices?.[0]?.message?.content) aiResponseContent = completion.choices[0].message.content;
        } else if (providerName === 'Gemini') {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: modelToUse });
            const chatHistoryForGemini = formattedMessages.slice(0, -1);
            const lastUserMessageParts = formattedMessages[formattedMessages.length - 1].parts;
            const chat = model.startChat({ history: chatHistoryForGemini });
            const result = await chat.sendMessage(lastUserMessageParts);
            if (result.response?.text) aiResponseContent = result.response.text();
        }
        if (!aiResponseContent) console.error(`Unexpected ${providerName} API response structure.`);
    } catch (apiError) {
        console.error(`${providerName} API Error using model ${modelToUse}:`, apiError.message || apiError);
        aiResponseContent = null;
    }
    return aiResponseContent;
};

// @desc    Get all messages for a specific chat session
exports.getMessagesForSession = async (req, res, next) => {
     try {
        const sessionId = req.params.sessionId;
        const session = await ChatSession.findById(sessionId);
        if (!session) return res.status(404).json({ success: false, error: `Chat session not found with id ${sessionId}` });
        if (session.user.toString() !== req.user.id) return res.status(403).json({ success: false, error: 'User not authorized' });
        const messages = await ChatMessage.find({ session: sessionId }).sort({ timestamp: 1 });
        res.status(200).json({ success: true, count: messages.length, data: messages });
    } catch (error) {
        console.error("Get Messages Error:", error);
        if (error.name === 'CastError') return res.status(404).json({ success: false, error: `Chat session not found with id ${req.params.sessionId}` });
        res.status(500).json({ success: false, error: 'Server Error fetching messages' });
    }
};

// @desc    Add a message (text and/or file) to a specific chat session (and trigger AI response)
exports.addMessageToSession = async (req, res, next) => {
  try {
    const sessionId = req.params.sessionId;
    const { content, model: requestedModel } = req.body;
    const uploadedFile = req.file;

    if (!content && !uploadedFile) return res.status(400).json({ success: false, error: 'Message content or a file upload is required.' });

    const session = await ChatSession.findById(sessionId);
    if (!session) return res.status(404).json({ success: false, error: `Chat session not found with id ${sessionId}` });
    if (session.user.toString() !== req.user.id) return res.status(403).json({ success: false, error: 'User not authorized' });

    // Prepare and save user message data
    const userMessageData = { session: sessionId, sender: 'user', content: content || '', fileInfo: uploadedFile ? { filename: uploadedFile.filename, originalname: uploadedFile.originalname, mimetype: uploadedFile.mimetype, size: uploadedFile.size, path: uploadedFile.path } : undefined };
    await ChatMessage.create(userMessageData);

    // Prepare combined content for AI
    let combinedContentForAI = content || '';
    if (uploadedFile) { /* ... PDF extraction logic ... */
        let fileTextContent = `[File Uploaded: ${uploadedFile.originalname} (${(uploadedFile.size / 1024).toFixed(1)} KB)]`;
        if (uploadedFile.mimetype === 'application/pdf') {
            try {
                const dataBuffer = fs.readFileSync(uploadedFile.path); const pdfData = await pdf(dataBuffer); const maxChars = 5000; const extractedText = pdfData.text.substring(0, maxChars);
                fileTextContent = `\n\n--- Start of PDF Content (${uploadedFile.originalname}) ---\n${extractedText}${pdfData.text.length > maxChars ? '\n[...content truncated]' : ''}\n--- End of PDF Content ---`;
            } catch (pdfError) { fileTextContent = `\n\n[File Uploaded: ${uploadedFile.originalname} - Error reading content]`; }
        } combinedContentForAI += `\n${fileTextContent}`;
    }

    // --- Auto-generate Title (if needed) ---
    let generatedTitle = null;
    let titleUpdated = false;
     if (session.title === 'New Chat') { /* ... title generation logic ... */
        const successfulApiKeyEntryForTitle = await ApiKey.findOne({ providerName: 'Anthropic', isEnabled: true }) || await ApiKey.findOne({ providerName: 'OpenAI', isEnabled: true }) || await ApiKey.findOne({ providerName: 'Gemini', isEnabled: true });
        if (successfulApiKeyEntryForTitle?.keyValue) {
             const titleProvider = successfulApiKeyEntryForTitle.providerName;
            try {
                const titlePrompt = `Generate a very concise title (3-5 words max) for a chat that starts with this message: "${combinedContentForAI}"`; const titleApiKey = successfulApiKeyEntryForTitle.keyValue;
                 if (titleProvider === 'Anthropic') { const titleAnthropic = new Anthropic({ apiKey: titleApiKey }); const titleMsg = await titleAnthropic.messages.create({ model: "claude-3-haiku-20240307", max_tokens: 20, messages: [{ role: 'user', content: titlePrompt }] }); if (titleMsg.content?.[0]?.type === 'text') generatedTitle = titleMsg.content[0].text;
                } else if (titleProvider === 'OpenAI') { const titleOpenai = new OpenAI({ apiKey: titleApiKey }); const titleCompletion = await titleOpenai.chat.completions.create({ model: "gpt-3.5-turbo", messages: [{ role: 'user', content: titlePrompt }], max_tokens: 20 }); generatedTitle = titleCompletion.choices?.[0]?.message?.content;
                } else if (titleProvider === 'Gemini') { const titleGenAI = new GoogleGenerativeAI(titleApiKey); const titleModel = titleGenAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); const titleResult = await titleModel.generateContent(titlePrompt); generatedTitle = titleResult.response?.text ? titleResult.response.text() : null; }
                if (generatedTitle) { generatedTitle = generatedTitle.trim().replace(/^"|"$/g, ''); await ChatSession.findByIdAndUpdate(sessionId, { title: generatedTitle }); titleUpdated = true; console.log(`Generated title using ${titleProvider}: ${generatedTitle}`);
                } else { console.warn(`Could not generate title using ${titleProvider}.`); }
            } catch (titleError) { console.error(`Error generating chat title using ${titleProvider}:`, titleError); }
        } else { console.warn('Could not generate title: No suitable API key found or enabled.'); }
    }

    // --- AI Response Generation (Revised Logic with Provider Fallback) ---
    let aiResponseContent = null;
    let providerUsed = null;
    const history = await ChatMessage.find({ session: sessionId }).sort({ timestamp: 1 });

    console.log(`User requested model: ${requestedModel || 'None (use default)'}`);
    if (requestedModel) {
        const targetProvider = findProviderForModel(requestedModel);
        if (targetProvider) {
            console.log(`Found provider ${targetProvider} for requested model ${requestedModel}`);
            const apiKeyEntry = await ApiKey.findOne({ providerName: targetProvider, isEnabled: true });
            if (apiKeyEntry?.keyValue) {
                console.log(`API key found for ${targetProvider}. Attempting API call with requested model...`);
                aiResponseContent = await callApi(targetProvider, apiKeyEntry.keyValue, requestedModel, history, combinedContentForAI);
                if (aiResponseContent !== null) {
                    console.log(`Successfully got response from requested provider ${targetProvider} with model ${requestedModel}`);
                    providerUsed = targetProvider;
                } else {
                     console.warn(`API call failed for requested provider ${targetProvider} with model ${requestedModel}. Trying default model for ${targetProvider}...`);
                     const defaultModelForProvider = DEFAULT_MODELS[targetProvider];
                     if (defaultModelForProvider && defaultModelForProvider !== requestedModel) {
                         aiResponseContent = await callApi(targetProvider, apiKeyEntry.keyValue, defaultModelForProvider, history, combinedContentForAI);
                         if (aiResponseContent !== null) {
                             console.log(`Successfully got response from requested provider ${targetProvider} with DEFAULT model ${defaultModelForProvider}`);
                             providerUsed = targetProvider;
                         } else { console.warn(`Default model ${defaultModelForProvider} for ${targetProvider} also failed. Falling back...`); }
                     } else { console.warn(`No different default model to try for ${targetProvider}. Falling back...`); }
                }
            } else { console.warn(`API key for requested provider ${targetProvider} is disabled or missing. Falling back...`); }
        } else { console.warn(`Requested model ${requestedModel} not found in available models list. Falling back...`); }
    }

    // Fallback: Try other providers sequentially if no model requested OR requested provider/models failed
    console.log(`Checking sequential fallback. providerUsed: ${providerUsed}`);
    if (!providerUsed) {
        console.log("Attempting sequential provider fallback based on priority...");
        const enabledKeysSorted = await ApiKey.find({ isEnabled: true }).sort({ priority: 1 }); // Fetch sorted by priority

        if (!enabledKeysSorted || enabledKeysSorted.length === 0) {
             console.error("No enabled API keys found for fallback.");
        } else {
            for (const apiKeyEntry of enabledKeysSorted) {
                const providerName = apiKeyEntry.providerName;
                // Skip if this provider was already tried because it was requested and failed both times
                if (requestedModel && findProviderForModel(requestedModel) === providerName) {
                    console.log(`Skipping fallback for ${providerName} as it was already tried.`);
                    continue;
                }

                console.log(`Fallback: Trying provider ${providerName} (Priority: ${apiKeyEntry.priority})`);
                const modelToUse = DEFAULT_MODELS[providerName];
                if (!modelToUse) {
                    console.warn(`No default model defined for fallback provider ${providerName}. Skipping.`);
                    continue;
                }

                aiResponseContent = await callApi(providerName, apiKeyEntry.keyValue, modelToUse, history, combinedContentForAI);
                if (aiResponseContent !== null) {
                    console.log(`Fallback successful with ${providerName} using model ${modelToUse}.`);
                    providerUsed = providerName;
                    break; // Success
                } else {
                    console.warn(`Fallback failed for ${providerName}.`);
                }
            }
        }
    }

    // If still no success, set default error message
    if (!providerUsed) {
        console.error("Failed to get response from any enabled AI provider.");
        aiResponseContent = 'Sorry, I could not process that.';
    }

    // Determine the actual model used for the successful response
    const actualModelUsed = providerUsed
        ? (requestedModel && findProviderForModel(requestedModel) === providerUsed ? requestedModel : DEFAULT_MODELS[providerUsed])
        : null; // No model used if all providers failed

    // Save the AI's response message, including the model used
    const aiMessage = await ChatMessage.create({
        session: sessionId,
        sender: 'ai',
        content: aiResponseContent,
        modelUsed: actualModelUsed // Save the model name
    });

    // Send back the AI's response message
    res.status(201).json({
      success: true,
      data: aiMessage, // aiMessage now contains modelUsed if applicable
      // No longer need to send providerUsed/modelUsed separately in response
      ...(titleUpdated && { updatedSessionTitle: generatedTitle })
    });

  } catch (error) {
    console.error("Add Message Error:", error);
     if (error.name === 'CastError') return res.status(404).json({ success: false, error: `Chat session not found with id ${req.params.sessionId}` });
     if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ success: false, error: messages });
    }
    res.status(500).json({ success: false, error: 'Server Error adding message' });
  }
};
