// Import SDKs
const Anthropic = require('@anthropic-ai/sdk');
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Import Models
const AIDocMessage = require('../models/AIDocMessage');
const AIDocSession = require('../models/AIDocSession');
const ApiKey = require('../models/ApiKey');

// Import AVAILABLE_MODELS from providers controller
const { AVAILABLE_MODELS } = require('./providers');

// Define default models per provider
const DEFAULT_MODELS = {
    'Anthropic': 'claude-3-haiku-20240307',
    'OpenAI': 'gpt-3.5-turbo',
    'Gemini': 'gemini-1.5-flash-latest',
    'DeepSeek': 'deepseek-chat',
    'Perplexity': 'perplexity/sonar'
};

// Helper function to find provider for a given model
const findProviderForModel = (modelName) => {
    if (modelName.startsWith('perplexity/')) {
        return 'Perplexity';
    }
    for (const [provider, models] of Object.entries(AVAILABLE_MODELS)) {
        if (models.some(model => model.name === modelName)) {
            return provider;
        }
    }
    console.warn(`Provider not found for model: ${modelName}`);
    return null;
};

// Helper function to format message history for different providers
const formatMessagesForProvider = (providerName, history, finalUserMessageContent) => {
    const historyForProvider = history.map((msg, index) => {
        const isLastUserMessage = index === history.length - 1 && msg.sender === 'user';

        if (isLastUserMessage) {
            if (providerName === 'Anthropic' || providerName === 'OpenAI' || providerName === 'DeepSeek' || providerName === 'Perplexity') {
                return { role: 'user', content: finalUserMessageContent };
            } else if (providerName === 'Gemini') {
                const parts = Array.isArray(finalUserMessageContent) ? finalUserMessageContent : [{ text: finalUserMessageContent || "" }];
                return { role: 'user', parts: parts };
            }
        } else {
            if (!msg.content) return null;
            if (providerName === 'Anthropic' || providerName === 'OpenAI' || providerName === 'DeepSeek' || providerName === 'Perplexity') {
                return { role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.content };
            } else if (providerName === 'Gemini') {
                return { role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] };
            }
        }
        return null;
    }).filter(Boolean);

    let formattedMessages = historyForProvider;

    if (providerName === 'Gemini' || providerName === 'DeepSeek' || providerName === 'Perplexity') {
        const assistantRole = providerName === 'Gemini' ? 'model' : 'assistant';
        if (formattedMessages.length > 0 && formattedMessages[0].role === assistantRole) {
            formattedMessages.shift();
        }
        formattedMessages = formattedMessages.filter((item, index, arr) =>
            index === 0 || item.role !== arr[index - 1].role);
    }

    return formattedMessages;
};

// @desc    Get messages for a specific AIDoc session
// @route   GET /api/v1/aidocsessions/:sessionId/messages
// @access  Private
exports.getMessagesForAIDocSession = async (req, res, next) => {
    try {
        const sessionId = req.params.sessionId;
        const session = await AIDocSession.findById(sessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                error: `AIDoc session not found with id ${sessionId}`
            });
        }

        if (session.user.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'User not authorized'
            });
        }

        // Update lastAccessedAt
        session.lastAccessedAt = Date.now();
        await session.save();

        const messages = await AIDocMessage.find({ session: sessionId }).sort({ timestamp: 1 });

        res.status(200).json({
            success: true,
            count: messages.length,
            data: messages,
        });
    } catch (error) {
        console.error('Get AIDoc Messages Error:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({
                success: false,
                error: `AIDoc session not found with id ${req.params.sessionId}`
            });
        }
        res.status(500).json({ success: false, error: 'Server Error fetching AIDoc messages' });
    }
};

// @desc    Add a message to AIDoc session and trigger AI response
// @route   POST /api/v1/aidocsessions/:sessionId/messages
// @access  Private
exports.addMessageToAIDocSession = async (req, res, next) => {
    console.log(`Entering addMessageToAIDocSession for session ID: ${req.params.sessionId}`);
    try {
        const sessionId = req.params.sessionId;
        const { content, model: requestedModel } = req.body;
        const shouldStream = req.body.stream !== 'false';

        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Message content is required.'
            });
        }

        let session = await AIDocSession.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: `AIDoc session not found with id ${sessionId}`
            });
        }

        if (session.user.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'User not authorized'
            });
        }

        // Save user message
        const userMessageData = {
            session: sessionId,
            sender: 'user',
            content: content.trim(),
            timestamp: new Date()
        };

        const savedUserMessage = await AIDocMessage.create(userMessageData);
        console.log("Saved user message to DB:", savedUserMessage._id);

        // Update session timestamps
        session.lastMessageTimestamp = savedUserMessage.timestamp;
        session.lastAccessedAt = savedUserMessage.timestamp;
        
        // Auto-generate title from first message if needed
        let titleUpdated = false;
        if (!session.title || session.title === 'New Medical Consultation') {
            const messageCount = await AIDocMessage.countDocuments({ session: sessionId });
            if (messageCount === 1) {
                const truncatedContent = content.trim().substring(0, 50);
                session.title = truncatedContent + (content.trim().length > 50 ? '...' : '');
                titleUpdated = true;
            }
        }
        
        await session.save();

        // Determine model to use
        const modelToUse = requestedModel || session.modelUsed || DEFAULT_MODELS['OpenAI'];
        const providerName = findProviderForModel(modelToUse);

        if (!providerName) {
            return res.status(400).json({
                success: false,
                error: `Unable to determine provider for model: ${modelToUse}`
            });
        }

        // Get API key
        const apiKeyDoc = await ApiKey.findOne({ providerName, isEnabled: true });
        if (!apiKeyDoc) {
            return res.status(503).json({
                success: false,
                error: `API key for ${providerName} not found or disabled.`
            });
        }

        // Get message history
        const previousMessages = await AIDocMessage.find({ session: sessionId })
            .sort({ timestamp: 1 })
            .limit(50);

        const history = previousMessages.map(msg => ({
            sender: msg.sender,
            content: msg.content
        }));

        // Get system prompt from session or use default
        const systemPrompt = session.systemPrompt || '';

        if (shouldStream) {
            console.log("Processing AIDoc request with streaming enabled.");
            let actualModelUsed = null;
            let finalAiContent = null;
            let finalReasoningContent = '';
            let streamError = false;

            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });

            const sendSse = (data) => {
                if (!res.writableEnded) {
                    res.write(`data: ${JSON.stringify(data)}\n\n`);
                }
            };

            sendSse({ type: 'user_message_saved', message: savedUserMessage });
            if (titleUpdated) {
                sendSse({
                    type: 'title_update',
                    title: session.title,
                    sessionId: sessionId,
                    lastAccessedAt: session.lastAccessedAt,
                    lastMessageTimestamp: session.lastMessageTimestamp
                });
            }

            try {
                await streamAIResponse(
                    providerName,
                    apiKeyDoc.keyValue,
                    modelToUse,
                    history,
                    content.trim(),
                    systemPrompt,
                    sendSse,
                    (aiContent, reasoning) => {
                        finalAiContent = aiContent;
                        finalReasoningContent = reasoning;
                        actualModelUsed = modelToUse;
                    }
                );
            } catch (streamErr) {
                console.error("Streaming Error:", streamErr);
                streamError = true;
                sendSse({
                    type: 'error',
                    error: streamErr.message || 'Error during streaming'
                });
            }

            if (!streamError && finalAiContent) {
                const aiMessageData = {
                    session: sessionId,
                    sender: 'ai',
                    content: finalAiContent,
                    timestamp: new Date(),
                    modelUsed: actualModelUsed,
                    reasoningContent: finalReasoningContent || null
                };

                const savedAiMessage = await AIDocMessage.create(aiMessageData);
                session.lastMessageTimestamp = savedAiMessage.timestamp;
                session.lastAccessedAt = savedAiMessage.timestamp;
                await session.save();

                sendSse({ type: 'ai_message_saved', message: savedAiMessage });
            }

            sendSse({ type: 'done' });
            res.end();
        } else {
            // Non-streaming response
            console.log("Processing AIDoc request without streaming.");
            const apiResult = await callNonStreamingAPI(
                providerName,
                apiKeyDoc.keyValue,
                modelToUse,
                history,
                content.trim(),
                systemPrompt
            );

            if (!apiResult || !apiResult.content) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to get response from AI'
                });
            }

            const aiMessageData = {
                session: sessionId,
                sender: 'ai',
                content: apiResult.content,
                timestamp: new Date(),
                modelUsed: modelToUse
            };

            const savedAiMessage = await AIDocMessage.create(aiMessageData);
            session.lastMessageTimestamp = savedAiMessage.timestamp;
            session.lastAccessedAt = savedAiMessage.timestamp;
            await session.save();

            res.status(201).json({
                success: true,
                data: {
                    userMessage: savedUserMessage,
                    aiMessage: savedAiMessage
                }
            });
        }
    } catch (error) {
        console.error("Add AIDoc Message Error:", error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Server Error adding AIDoc message' });
        }
    }
};

// Helper function for streaming API calls
async function streamAIResponse(providerName, apiKey, modelToUse, history, userContent, systemPrompt, sendSse, onComplete) {
    let accumulatedContent = '';
    let accumulatedReasoning = '';

    const formattedMessages = formatMessagesForProvider(providerName, history, userContent);

    // Add system prompt
    if (systemPrompt) {
        if (providerName === 'OpenAI' || providerName === 'DeepSeek' || providerName === 'Perplexity') {
            formattedMessages.unshift({ role: 'system', content: systemPrompt });
        }
    }

    try {
        if (providerName === 'Anthropic') {
            const anthropic = new Anthropic({ apiKey });
            const stream = await anthropic.messages.stream({
                model: modelToUse,
                max_tokens: 4096,
                messages: formattedMessages,
                ...(systemPrompt && { system: systemPrompt })
            });

            for await (const chunk of stream) {
                if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
                    const text = chunk.delta.text;
                    accumulatedContent += text;
                    sendSse({ type: 'content', content: text });
                }
            }
        } else if (providerName === 'OpenAI' || providerName === 'DeepSeek' || providerName === 'Perplexity') {
            const clientOptions = { apiKey };
            if (providerName === 'DeepSeek') {
                clientOptions.baseURL = 'https://api.deepseek.com/v1';
            } else if (providerName === 'Perplexity') {
                clientOptions.baseURL = 'https://api.perplexity.ai';
            }
            const client = new OpenAI(clientOptions);

            const actualModelName = providerName === 'Perplexity' && modelToUse.startsWith('perplexity/')
                ? modelToUse.substring('perplexity/'.length)
                : modelToUse;

            const stream = await client.chat.completions.create({
                model: actualModelName,
                messages: formattedMessages,
                stream: true
            });

            for await (const chunk of stream) {
                const delta = chunk.choices?.[0]?.delta;
                if (delta?.content) {
                    accumulatedContent += delta.content;
                    sendSse({ type: 'content', content: delta.content });
                }

                // Handle reasoning for DeepSeek
                if (providerName === 'DeepSeek' && delta?.reasoning_content) {
                    accumulatedReasoning += delta.reasoning_content;
                    sendSse({ type: 'reasoning', content: delta.reasoning_content });
                }
            }
        } else if (providerName === 'Gemini') {
            const genAI = new GoogleGenerativeAI(apiKey);
            const modelParams = {
                model: modelToUse,
                ...(systemPrompt && { systemInstruction: systemPrompt })
            };
            const model = genAI.getGenerativeModel(modelParams);

            const chatHistoryForGemini = formattedMessages.slice(0, -1);
            const lastUserMessageParts = formattedMessages[formattedMessages.length - 1].parts;

            const chat = model.startChat({ history: chatHistoryForGemini });
            const result = await chat.sendMessageStream(lastUserMessageParts);

            for await (const chunk of result.stream) {
                const text = chunk.text();
                if (text) {
                    accumulatedContent += text;
                    sendSse({ type: 'content', content: text });
                }
            }
        }

        onComplete(accumulatedContent, accumulatedReasoning);
    } catch (error) {
        console.error(`Streaming error for ${providerName}:`, error);
        throw error;
    }
}

// Helper function for non-streaming API calls
async function callNonStreamingAPI(providerName, apiKey, modelToUse, history, userContent, systemPrompt) {
    let aiResponseContent = null;
    const formattedMessages = formatMessagesForProvider(providerName, history, userContent);

    if (systemPrompt) {
        if (providerName === 'OpenAI' || providerName === 'DeepSeek' || providerName === 'Perplexity') {
            formattedMessages.unshift({ role: 'system', content: systemPrompt });
        }
    }

    try {
        if (providerName === 'Anthropic') {
            const anthropic = new Anthropic({ apiKey });
            const msg = await anthropic.messages.create({
                model: modelToUse,
                max_tokens: 4096,
                messages: formattedMessages,
                ...(systemPrompt && { system: systemPrompt })
            });
            if (msg.content?.[0]?.type === 'text') {
                aiResponseContent = msg.content[0].text;
            }
        } else if (providerName === 'OpenAI' || providerName === 'DeepSeek' || providerName === 'Perplexity') {
            const clientOptions = { apiKey };
            if (providerName === 'DeepSeek') {
                clientOptions.baseURL = 'https://api.deepseek.com/v1';
            } else if (providerName === 'Perplexity') {
                clientOptions.baseURL = 'https://api.perplexity.ai';
            }
            const client = new OpenAI(clientOptions);

            const actualModelName = providerName === 'Perplexity' && modelToUse.startsWith('perplexity/')
                ? modelToUse.substring('perplexity/'.length)
                : modelToUse;

            const completion = await client.chat.completions.create({
                model: actualModelName,
                messages: formattedMessages
            });

            if (completion.choices?.[0]?.message) {
                aiResponseContent = completion.choices[0].message.content || '';
            }
        } else if (providerName === 'Gemini') {
            const genAI = new GoogleGenerativeAI(apiKey);
            const modelParams = {
                model: modelToUse,
                ...(systemPrompt && { systemInstruction: systemPrompt })
            };
            const model = genAI.getGenerativeModel(modelParams);

            const chatHistoryForGemini = formattedMessages.slice(0, -1);
            const lastUserMessageParts = formattedMessages[formattedMessages.length - 1].parts;

            const chat = model.startChat({ history: chatHistoryForGemini });
            const result = await chat.sendMessage(lastUserMessageParts);
            if (result.response?.text) {
                aiResponseContent = result.response.text();
            }
        }
    } catch (error) {
        console.error(`Non-streaming API error for ${providerName}:`, error);
        throw error;
    }

    return { content: aiResponseContent };
}

