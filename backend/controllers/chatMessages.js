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
const CustomModel = require('../models/CustomModel'); // Import CustomModel
const mongoose = require('mongoose'); // Import mongoose for ObjectId check
const path = require('path'); // Import path for resolving file paths

// Import AVAILABLE_MODELS from providers controller
const { AVAILABLE_MODELS } = require('./providers');

// Define default models per provider (ensure these exist in AVAILABLE_MODELS)
const DEFAULT_MODELS = {
    'Anthropic': 'claude-3-haiku-20240307',
    'OpenAI': 'gpt-3.5-turbo',
    'Gemini': 'gemini-1.5-flash-latest',
    'DeepSeek': 'deepseek-chat', // Added DeepSeek default
    'Perplexity': 'perplexity/sonar' // Added Perplexity default
};

// Helper function to find provider for a given model
const findProviderForModel = (modelName) => {
    // Special case for Perplexity models which include the "perplexity/" prefix
    if (modelName.startsWith('perplexity/')) {
        return 'Perplexity';
    }

    // Standard check for other providers
    for (const [provider, models] of Object.entries(AVAILABLE_MODELS)) {
        // Check if any model object in the array has the matching name
        if (models.some(model => model.name === modelName)) {
            return provider;
        }
    }
    console.warn(`Provider not found for model: ${modelName}`);
    return null;
};

// Helper function to check if a model supports vision
const modelSupportsVision = (modelName) => {
    for (const models of Object.values(AVAILABLE_MODELS)) {
        const modelData = models.find(m => m.name === modelName);
        if (modelData) {
            return modelData.supportsVision || false;
        }
    }
    return false; // Default to false if model not found
};


// Helper function to format message history for different providers
// Now accepts finalUserMessageContent which might be a string or a multimodal array
const formatMessagesForProvider = (providerName, history, finalUserMessageContent) => {
    const historyForProvider = history.map((msg, index) => {
        const isLastUserMessage = index === history.length - 1 && msg.sender === 'user';

        // Use the pre-formatted finalUserMessageContent for the last user message
        if (isLastUserMessage) {
            // Handle different structures based on provider
            if (providerName === 'Anthropic' || providerName === 'OpenAI' || providerName === 'DeepSeek' || providerName === 'Perplexity') {
                // These expect a 'content' field which can be string or array
                return { role: 'user', content: finalUserMessageContent };
            } else if (providerName === 'Gemini') {
                // Gemini expects 'parts' which should already be formatted correctly in finalUserMessageContent
                 // If finalUserMessageContent is just text, wrap it
                 const parts = Array.isArray(finalUserMessageContent) ? finalUserMessageContent : [{ text: finalUserMessageContent || "" }];
                 return { role: 'user', parts: parts };
            }
        } else {
            // Handle previous messages (always text for now)
            if (!msg.content) return null; // Skip previous empty messages

            if (providerName === 'Anthropic' || providerName === 'OpenAI' || providerName === 'DeepSeek' || providerName === 'Perplexity') {
                return { role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.content };
            } else if (providerName === 'Gemini') {
                return { role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] };
            }
        }
        return null;
    }).filter(Boolean); // Remove null entries (like empty previous messages)

    let formattedMessages = historyForProvider;

    // Gemini, DeepSeek, Perplexity specific formatting: remove leading assistant/model message, ensure alternating roles
    if (providerName === 'Gemini' || providerName === 'DeepSeek' || providerName === 'Perplexity') {
        const assistantRole = providerName === 'Gemini' ? 'model' : 'assistant'; // Perplexity uses 'assistant' like OpenAI
        if (formattedMessages.length > 0 && formattedMessages[0].role === assistantRole) {
            formattedMessages.shift(); // Remove leading assistant/model message
        }
        formattedMessages = formattedMessages.filter((item, index, arr) =>
            index === 0 || item.role !== arr[index - 1].role);
    }

    return formattedMessages;
};


// Helper function for non-streaming API calls (used for title generation AND non-streaming responses)
// Returns an object { content: string | null, citations: Array | null }
// Takes finalUserMessageContent instead of combinedContentForAI
const callApi = async (providerName, apiKey, modelToUse, history, finalUserMessageContent, systemPrompt = null) => {
    let aiResponseContent = null;
    let extractedCitations = null; // Initialize citations as null
    // Pass the *full* history including the latest user message for formatting
    // formatMessagesForProvider now handles the potentially complex finalUserMessageContent
    let formattedMessages = formatMessagesForProvider(providerName, history, finalUserMessageContent);

    // --- System Prompt Injection ---
    // Note: Title generation calls won't have a system prompt or complex content.
    if (systemPrompt) {
        console.log(`Injecting system prompt for ${providerName} (Non-Streaming)`);
        if (providerName === 'OpenAI' || providerName === 'DeepSeek' || providerName === 'Perplexity') {
            // Prepend system message for OpenAI compatible APIs
            formattedMessages.unshift({ role: 'system', content: systemPrompt });
        }
        // Anthropic and Gemini handle system prompts via dedicated parameters below
    }
    // --- End System Prompt Injection ---

    try {
        console.log(`Calling ${providerName} with model ${modelToUse} (Non-Streaming) with system prompt: ${!!systemPrompt}`);
        if (providerName === 'Anthropic') {
            const anthropic = new Anthropic({ apiKey });
            const requestPayload = {
                model: modelToUse,
                max_tokens: 1024,
                messages: formattedMessages,
                ...(systemPrompt && { system: systemPrompt }) // Add system prompt if provided
            };
            console.log("Anthropic Non-Streaming Payload:", JSON.stringify(requestPayload, null, 2));
            const msg = await anthropic.messages.create(requestPayload);
            if (msg.content?.[0]?.type === 'text') aiResponseContent = msg.content[0].text;
        } else if (providerName === 'OpenAI' || providerName === 'DeepSeek' || providerName === 'Perplexity') { // Combined OpenAI, DeepSeek, Perplexity
            const clientOptions = { apiKey };
            if (providerName === 'DeepSeek') {
                clientOptions.baseURL = 'https://api.deepseek.com/v1';
            } else if (providerName === 'Perplexity') {
                clientOptions.baseURL = 'https://api.perplexity.ai';
            }
            const client = new OpenAI(clientOptions);
            // For Perplexity, strip the "perplexity/" prefix from the model name
            const actualModelName = providerName === 'Perplexity' && modelToUse.startsWith('perplexity/')
                ? modelToUse.substring('perplexity/'.length)
                : modelToUse;

            console.log(`Using model name for ${providerName} API: ${actualModelName}`);

            // For Perplexity, we need to use a different approach to request citations
            let requestOptions = {
                model: actualModelName,
                messages: formattedMessages
            };
            
            // Add citations parameter directly for Perplexity
            if (providerName === 'Perplexity') {
                console.log('Adding citations parameter for Perplexity non-streaming request');
                // Try direct approach
                requestOptions.citations = true;
            }
            
            console.log('Non-streaming request options:', JSON.stringify(requestOptions, null, 2));
            const completion = await client.chat.completions.create(requestOptions);
            if (completion.choices?.[0]?.message) {
                // Extract content
                aiResponseContent = completion.choices[0].message.content || '';

                // Extract citations if this is a Perplexity response
                // Check both locations where citations might be found
                if (providerName === 'Perplexity') {
                    // Check for citations at the top level of the response (new API format)
                    if (completion.citations) {
                        extractedCitations = completion.citations;
                        console.log('Perplexity citations found at top level:', JSON.stringify(extractedCitations, null, 2));
                    } 
                    // Also check the old location inside message (for backward compatibility)
                    else if (completion.choices[0].message.citations) {
                        extractedCitations = completion.choices[0].message.citations;
                        console.log('Perplexity citations found in message:', JSON.stringify(extractedCitations, null, 2));
                    }
                    
                    if (extractedCitations) {
                        console.log('Citations type:', typeof extractedCitations);
                        console.log('Citations length:', extractedCitations.length);
                        
                        // Convert URL-only citations to proper format if needed
                        if (Array.isArray(extractedCitations) && extractedCitations.length > 0 && typeof extractedCitations[0] === 'string') {
                            // Convert simple URL strings to citation objects
                            extractedCitations = extractedCitations.map((url, index) => ({
                                url: url,
                                title: `Source ${index + 1}`,
                                // No snippet available for simple URL citations
                            }));
                            console.log('Converted URL citations to objects:', JSON.stringify(extractedCitations, null, 2));
                        }
                    } else {
                        console.log('No citations found in Perplexity response');
                    }
                    
                    // DO NOT append formatted citations to aiResponseContent here anymore
                    // The frontend will handle rendering from the 'citations' field
                }
            }
        } else if (providerName === 'Gemini') {
            const genAI = new GoogleGenerativeAI(apiKey);
            // Add system instruction if provided
            const modelParams = { 
                model: modelToUse,
                ...(systemPrompt && { systemInstruction: systemPrompt }) 
            };
            console.log("Gemini Model Params (Non-Streaming):", modelParams);
            const model = genAI.getGenerativeModel(modelParams);
            
            // Gemini requires history and the last message separately for chat.sendMessage
            const chatHistoryForGemini = formattedMessages.slice(0, -1);
            const lastUserMessageParts = formattedMessages[formattedMessages.length - 1].parts;
            
            // Start chat with history (system prompt is part of model init)
            const chat = model.startChat({ history: chatHistoryForGemini });
            console.log("Gemini Sending Message Parts (Non-Streaming):", JSON.stringify(lastUserMessageParts, null, 2));
            const result = await chat.sendMessage(lastUserMessageParts);
            if (result.response?.text) aiResponseContent = result.response.text();
        }
        // Add more specific logging if aiResponseContent is null after try block
        if (aiResponseContent === null) {
             console.error(`Failed to extract content from ${providerName} API response for model ${modelToUse}. Response structure might be unexpected or content was empty.`);
        }
    } catch (apiError) {
        // Log the full error object for more details
        console.error(`${providerName} API Error (Non-Streaming) using model ${modelToUse}:`, apiError);
        aiResponseContent = null; // Ensure null is returned on error
        extractedCitations = null; // Ensure citations are null on error too
    }
    // Return both content and citations
    return { content: aiResponseContent, citations: extractedCitations };
};

// Helper function for streaming API calls
// Takes finalUserMessageContent instead of combinedContentForAI
const callApiStream = async (providerName, apiKey, modelToUse, history, finalUserMessageContent, sendSse, systemPrompt = null) => {
    let fullResponseContent = ''; // Accumulate full response
    let fullReasoningContent = ''; // Accumulate reasoning content
    let fullCitations = []; // Store citations for later use
    let errorOccurred = false;
    // Pass the *full* history including the latest user message for formatting
    // formatMessagesForProvider now handles the potentially complex finalUserMessageContent
    let formattedMessages = formatMessagesForProvider(providerName, history, finalUserMessageContent);

    // --- System Prompt Injection ---
    if (systemPrompt) {
        console.log(`Injecting system prompt for ${providerName} (Streaming)`);
        if (providerName === 'OpenAI' || providerName === 'DeepSeek' || providerName === 'Perplexity') {
            // Prepend system message for OpenAI compatible APIs
            formattedMessages.unshift({ role: 'system', content: systemPrompt });
        }
        // Anthropic and Gemini handle system prompts via dedicated parameters below
    }
    // --- End System Prompt Injection ---

    try {
        console.log(`Calling ${providerName} with model ${modelToUse} for streaming with system prompt: ${!!systemPrompt}...`);

        if (providerName === 'Anthropic') {
            const anthropic = new Anthropic({ apiKey });
            const requestPayload = {
                model: modelToUse,
                max_tokens: 1024,
                messages: formattedMessages,
                stream: true,
                ...(systemPrompt && { system: systemPrompt }) // Add system prompt if provided
            };
            console.log("Anthropic Streaming Payload:", JSON.stringify(requestPayload, null, 2));
            const stream = await anthropic.messages.stream(requestPayload);

            for await (const event of stream) {
                if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                    const chunk = event.delta.text;
                    fullResponseContent += chunk;
                    sendSse({ type: 'chunk', content: chunk });
                }
            }
        }
        else if (providerName === 'OpenAI' || providerName === 'DeepSeek' || providerName === 'Perplexity') { // Add Perplexity
            const clientOptions = { apiKey };
            if (providerName === 'DeepSeek') {
                clientOptions.baseURL = 'https://api.deepseek.com/v1';
            } else if (providerName === 'Perplexity') {
                clientOptions.baseURL = 'https://api.perplexity.ai';
            }

            const client = new OpenAI(clientOptions);
            // For Perplexity, strip the "perplexity/" prefix from the model name
            const actualModelName = providerName === 'Perplexity' && modelToUse.startsWith('perplexity/')
                ? modelToUse.substring('perplexity/'.length)
                : modelToUse;

            console.log(`Using model name for ${providerName} API streaming: ${actualModelName}`);

            // For Perplexity, we'll make a separate non-streaming call first to get citations
            // since citations might not be fully supported in streaming mode
            let citationsFromNonStreaming = [];
            
            if (providerName === 'Perplexity') {
                try {
                    console.log('Making separate non-streaming call to get citations for Perplexity');
                    
                    // Make a non-streaming call with citations parameter
                    const nonStreamingOptions = {
                        model: actualModelName,
                        messages: formattedMessages,
                        citations: true
                    };
                    
                    console.log('Non-streaming citation request options:', JSON.stringify(nonStreamingOptions, null, 2));
                    const nonStreamingResponse = await client.chat.completions.create(nonStreamingOptions);
                    
                    // Extract citations from the response
                    if (nonStreamingResponse.citations) {
                        citationsFromNonStreaming = nonStreamingResponse.citations;
                        console.log('Citations found at top level in non-streaming call:', JSON.stringify(citationsFromNonStreaming, null, 2));
                    } else if (nonStreamingResponse.choices?.[0]?.message?.citations) {
                        citationsFromNonStreaming = nonStreamingResponse.choices[0].message.citations;
                        console.log('Citations found in message in non-streaming call:', JSON.stringify(citationsFromNonStreaming, null, 2));
                    }
                    
                    // If we got citations, send them to the client immediately
                    if (citationsFromNonStreaming && citationsFromNonStreaming.length > 0) {
                        console.log(`Got ${citationsFromNonStreaming.length} citations from non-streaming call`);
                        
                        // Convert URL-only citations to proper format if needed
                        if (Array.isArray(citationsFromNonStreaming) && citationsFromNonStreaming.length > 0 && 
                            typeof citationsFromNonStreaming[0] === 'string') {
                            citationsFromNonStreaming = citationsFromNonStreaming.map((url, index) => ({
                                url: url,
                                title: `Source ${index + 1}`
                            }));
                        }
                        
                        // Send citations to client
                        sendSse({
                            type: 'citations',
                            citations: citationsFromNonStreaming
                        });
                        
                        // Store citations for later use
                        fullCitations = citationsFromNonStreaming;
                    } else {
                        console.log('No citations found in non-streaming call');
                    }
                } catch (nonStreamingError) {
                    console.error('Error making non-streaming call for citations:', nonStreamingError);
                    // Continue with streaming even if non-streaming call fails
                }
            }
            
            // Now make the streaming call (without citations parameter to avoid errors)
            let requestOptions = {
                model: actualModelName,
                messages: formattedMessages,
                stream: true
            };
            
            console.log('Streaming request options:', JSON.stringify(requestOptions, null, 2));
            const stream = await client.chat.completions.create(requestOptions);

            for await (const chunk of stream) {
                // Log the entire chunk structure for inspection
                // console.log("Stream Chunk:", JSON.stringify(chunk, null, 2));

                const delta = chunk.choices[0]?.delta;
                const contentChunk = delta?.content || '';

                if (contentChunk) {
                    fullResponseContent += contentChunk;
                    sendSse({ type: 'chunk', content: contentChunk });
                } else if (delta && Object.keys(delta).length > 0) {
                    // Log the full delta object if it exists but has no 'content'
                    console.log("Stream Chunk Delta (FULL):", JSON.stringify(delta, null, 2));
                } else if (chunk.choices[0]?.finish_reason) {
                    console.log("Stream Chunk Finish Reason:", chunk.choices[0].finish_reason);

                            // If this is the end of a response, check for citations (for any provider, not just Perplexity)
                            if (chunk.choices[0].finish_reason === 'stop') {
                                try {
                                    console.log(`Stream finished for ${providerName}. Checking for citations...`);
                                    
                                    // Make a separate API call to get the full response with citations
                                    // Add explicit parameters to request citations
                                    let fullRequestOptions = {
                                        model: actualModelName,
                                        messages: formattedMessages
                                    };
                                    
                                    // Add citations parameter directly for Perplexity
                                    if (providerName === 'Perplexity') {
                                        console.log('Adding citations parameter for Perplexity full response request');
                                        // Try direct approach
                                        fullRequestOptions.citations = true;
                                    }
                                    
                                    console.log('Full response request options:', JSON.stringify(fullRequestOptions, null, 2));
                                    const fullResponse = await client.chat.completions.create(fullRequestOptions);

                                    console.log(`Got full response for ${providerName}:`, {
                                        hasTopLevelCitations: !!fullResponse.citations,
                                        hasMessageCitations: !!fullResponse.choices?.[0]?.message?.citations
                                    });

                                    let citations = null;
                                    
                                    // Check for citations at the top level of the response (new API format)
                                    if (fullResponse.citations) {
                                        citations = fullResponse.citations;
                                        console.log(`Citations found at top level for ${providerName} (streaming):`, JSON.stringify(citations, null, 2));
                                    } 
                                    // Also check the old location inside message (for backward compatibility)
                                    else if (fullResponse.choices?.[0]?.message?.citations) {
                                        citations = fullResponse.choices[0].message.citations;
                                        console.log(`Citations found in message for ${providerName} (streaming):`, JSON.stringify(citations, null, 2));
                                    }
                                    
                                    if (citations) {
                                        // Convert URL-only citations to proper format if needed
                                        if (Array.isArray(citations) && citations.length > 0 && typeof citations[0] === 'string') {
                                            // Convert simple URL strings to citation objects
                                            citations = citations.map((url, index) => ({
                                                url: url,
                                                title: `Source ${index + 1}`,
                                                // No snippet available for simple URL citations
                                            }));
                                            console.log('Converted URL citations to objects (streaming):', JSON.stringify(citations, null, 2));
                                        }
                                        
                                        // Send the raw citations data for the frontend to use
                                        sendSse({
                                            type: 'citations',
                                            citations: citations
                                        });

                                        // Store citations for later use when saving to DB
                                        fullCitations = citations;
                                    } else {
                                        console.log('No citations found in Perplexity streaming response');
                                    }
                        } catch (citationError) {
                            console.error('Error fetching citations during stream end:', citationError);
                        }
                    }
                }
                 // Check for reasoning_content
                 if (delta?.reasoning_content) {
                    const reasoningChunk = delta.reasoning_content;
                    console.log("Stream Chunk Reasoning Content:", reasoningChunk);
                    fullReasoningContent += reasoningChunk; // Accumulate reasoning
                    // Send reasoning content chunk
                    sendSse({ type: 'reasoning_chunk', content: reasoningChunk });
                 }
             }
         }
        else if (providerName === 'Gemini') {
            const genAI = new GoogleGenerativeAI(apiKey);
            // Add system instruction if provided
             const modelParams = { 
                model: modelToUse,
                ...(systemPrompt && { systemInstruction: systemPrompt }) 
            };
            console.log("Gemini Model Params (Streaming):", modelParams);
            const model = genAI.getGenerativeModel(modelParams);

            // Gemini stream API takes the full message list directly
            console.log("Gemini Sending Contents (Streaming):", JSON.stringify(formattedMessages, null, 2));
            const result = await model.generateContentStream({
                contents: formattedMessages // Send the whole formatted list
            });

            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                if (chunkText) {
                    fullResponseContent += chunkText;
                    sendSse({ type: 'chunk', content: chunkText });
                }
            }
        }
    } catch (apiError) {
        console.error(`${providerName} API Stream Error using model ${modelToUse}:`, apiError.message || apiError);
        errorOccurred = true;
        sendSse({ type: 'error', message: `Error from ${providerName}: ${apiError.message || 'API Error'}` });
    }

    // Return accumulated content, reasoning, citations and error status
    return { fullResponseContent, fullReasoningContent, fullCitations, errorOccurred };
};

// @desc    Get all messages for a specific chat session
exports.getMessagesForSession = async (req, res, next) => {
    try {
        const sessionId = req.params.sessionId;
        const session = await ChatSession.findById(sessionId);
        if (!session) return res.status(404).json({ success: false, error: `Chat session not found with id ${sessionId}` });
        if (session.user.toString() !== req.user.id) return res.status(403).json({ success: false, error: 'User not authorized' });

        // Update lastAccessedAt when messages are fetched (viewed)
        session.lastAccessedAt = Date.now();
        await session.save();
        console.log(`Updated lastAccessedAt for session ${sessionId} on message fetch.`);

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
    console.log(`Entering addMessageToSession for session ID: ${req.params.sessionId}`);
    try {
        const sessionId = req.params.sessionId;
        const { content, model: requestedModel } = req.body;
        const uploadedFile = req.file;
        const shouldStream = req.body.stream !== 'false'; // Default to streaming unless explicitly disabled

        console.log(`Received request: content='${content}', file=${uploadedFile?.originalname}, model='${requestedModel}', stream=${shouldStream}`);

        if (!content && !uploadedFile) return res.status(400).json({
            success: false,
            error: 'Message content or a file upload is required.'
        });

        const session = await ChatSession.findById(sessionId);
        if (!session) return res.status(404).json({
            success: false,
            error: `Chat session not found with id ${sessionId}`
        });

        if (session.user.toString() !== req.user.id) return res.status(403).json({
            success: false,
            error: 'User not authorized'
        });

        // Update lastAccessedAt when a message is added (interacted)
        session.lastAccessedAt = Date.now();
        await session.save();
        console.log(`Updated lastAccessedAt for session ${sessionId} on message add.`);

        // Prepare and save user message data
        const userMessageData = {
            session: sessionId,
            sender: 'user',
            content: content || '', // Save empty string if no text content
            fileInfo: uploadedFile ? {
                filename: uploadedFile.filename,
                originalname: uploadedFile.originalname,
                mimetype: uploadedFile.mimetype,
                size: uploadedFile.size,
                // Store a relative path instead of absolute path for better compatibility with deployment
                path: uploadedFile.path.replace(/^.*[\\\/]uploads[\\\/]/, 'uploads/')
            } : undefined
        };

        // Log the file path for debugging
        if (uploadedFile) {
            console.log('Original file path:', uploadedFile.path);
            console.log('Stored file path:', userMessageData.fileInfo.path);
        }
        const savedUserMessage = await ChatMessage.create(userMessageData);
        console.log("Saved user message to DB:", savedUserMessage._id);

        // --- Determine Model Identifiers and System Prompt ---
        // This block MUST run before preparing content for AI
        let customModelData = null;
        let modelIdentifierForApi = requestedModel; // Start with the requested model ID/name
        let systemPromptForApi = null;
        let finalModelNameToSave = requestedModel; // What to save in DB (custom ID or base name)

        if (requestedModel && mongoose.Types.ObjectId.isValid(requestedModel)) {
            console.log(`Requested model '${requestedModel}' looks like an ObjectId. Checking for CustomModel...`);
            customModelData = await CustomModel.findById(requestedModel);
            if (customModelData) {
                console.log(`Found CustomModel: ${customModelData.name}. Base Model: ${customModelData.baseModelIdentifier}`);
                modelIdentifierForApi = customModelData.baseModelIdentifier; // Use the base model for API calls
                systemPromptForApi = customModelData.systemPrompt; // Use the custom system prompt
                finalModelNameToSave = requestedModel; // Keep the custom model ID for saving
            } else {
                console.warn(`Requested model ID '${requestedModel}' not found in CustomModels. Treating as base model name.`);
                modelIdentifierForApi = requestedModel; // Fallback to treating it as a base model name
                finalModelNameToSave = requestedModel;
            }
        } else {
             console.log(`Requested model '${requestedModel || 'None'}' is not an ObjectId. Treating as base model name.`);
             modelIdentifierForApi = requestedModel; // Treat as base model name
             finalModelNameToSave = requestedModel;
        }
        // --- End Determine Model Identifiers ---


        // --- Prepare Content for AI (Text + Optional Image) ---
        let finalUserMessageContentForApi; // This will hold either string or multimodal array
        const userTextContent = content || ''; // User's text input

        // Check if a file was uploaded and if the determined model supports vision
        // modelIdentifierForApi is now guaranteed to be initialized
        const isVisionModel = modelSupportsVision(modelIdentifierForApi); // Check vision support for the *base* model
        const isImageFile = uploadedFile && uploadedFile.mimetype.startsWith('image/');

        if (isImageFile && isVisionModel) {
            console.log(`Image uploaded (${uploadedFile.originalname}) and model ${modelIdentifierForApi} supports vision.`);
            try {
                // Construct the full path to the uploaded file
                const fullFilePath = path.join(__dirname, '..', userMessageData.fileInfo.path);
                console.log(`Reading image file from: ${fullFilePath}`);
                const imageBuffer = await fs.promises.readFile(fullFilePath);
                const base64Image = imageBuffer.toString('base64');
                const mimeType = uploadedFile.mimetype;

                const providerForVision = findProviderForModel(modelIdentifierForApi); // Find provider for the base model

                if (providerForVision === 'OpenAI' || providerForVision === 'Perplexity') {
                    finalUserMessageContentForApi = [
                        { type: "text", text: userTextContent || "Analyze this image." }, // Ensure text part exists
                        // Corrected: image_url should be an object with a 'url' key
                        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                    ];
                    console.log(`Formatted for OpenAI/Perplexity vision.`);
                } else if (providerForVision === 'Anthropic') {
                    finalUserMessageContentForApi = [
                        { type: "image", source: { type: "base64", media_type: mimeType, data: base64Image } },
                        { type: "text", text: userTextContent || "Analyze this image." } // Ensure text part exists
                    ];
                    console.log(`Formatted for Anthropic vision.`);
                } else if (providerForVision === 'Gemini') {
                    // Gemini needs raw base64, no prefix
                    finalUserMessageContentForApi = [
                         // Text part first for Gemini based on examples? (Verify this)
                        { text: userTextContent || "Analyze this image." }, // Ensure text part exists
                        { inlineData: { mimeType: mimeType, data: base64Image } }
                    ];
                     console.log(`Formatted for Gemini vision (using inlineData).`);
                } else {
                    // Fallback if provider/model combo isn't handled (shouldn't happen if flagged correctly)
                    console.warn(`Vision model ${modelIdentifierForApi} from provider ${providerForVision} detected, but no specific formatting logic found. Sending text only.`);
                    finalUserMessageContentForApi = userTextContent;
                }

            } catch (imageError) {
                console.error("Error reading or encoding image file:", imageError);
                // Fallback to sending text only if image processing fails
                finalUserMessageContentForApi = userTextContent + `\n\n[Error processing uploaded image: ${uploadedFile.originalname}]`;
            }
        } else {
             // If no image, not an image file, or model doesn't support vision, prepare text-only content
             let combinedTextContent = userTextContent;
             if (uploadedFile && !isImageFile) { // Handle non-image files (like PDF text extraction)
                 let fileTextContent = `[File Uploaded: ${uploadedFile.originalname} (${(uploadedFile.size / 1024).toFixed(1)} KB)]`;
                 if (uploadedFile.mimetype === 'application/pdf') {
                     try {
                         const fullFilePath = path.join(__dirname, '..', userMessageData.fileInfo.path);
                         console.log(`Attempting to read PDF: ${fullFilePath}`);
                         const dataBuffer = fs.readFileSync(fullFilePath); // Use sync read here for simplicity or refactor outer scope to async
                         console.log(`Read PDF buffer, attempting to parse...`);
                         const pdfData = await pdf(dataBuffer); // pdf-parse is async
                         console.log(`Parsed PDF successfully.`);
                         const maxChars = 5000; // Limit extracted text length
                         const extractedText = pdfData.text.substring(0, maxChars);
                         fileTextContent = `\n\n--- Start of PDF Content (${uploadedFile.originalname}) ---\n${extractedText}${pdfData.text.length > maxChars ? '\n[...content truncated]' : ''}\n--- End of PDF Content ---`;
                     } catch (pdfError) {
                         console.error("Error processing PDF:", pdfError);
                         fileTextContent = `\n\n[File Uploaded: ${uploadedFile.originalname} - Error processing PDF content]`;
                     }
                 }
                 combinedTextContent = combinedTextContent ? `${combinedTextContent}\n${fileTextContent}` : fileTextContent;
             } else if (uploadedFile && isImageFile && !isVisionModel) {
                 // If it's an image but model doesn't support vision, just add filename info
                 combinedTextContent += `\n\n[Image Uploaded: ${uploadedFile.originalname}]`;
                 console.log(`Image uploaded but model ${modelIdentifierForApi} does not support vision. Sending text only.`);
             }
             finalUserMessageContentForApi = combinedTextContent;
        }
        // --- End Prepare Content for AI ---


        // --- Auto-generate Title (if needed) ---
        // Use only the text part for title generation if multimodal
        const textForTitleGen = typeof finalUserMessageContentForApi === 'string'
            ? finalUserMessageContentForApi
            : finalUserMessageContentForApi.find(part => part.type === 'text')?.text || '';

        let generatedTitle = null;
        let titleUpdated = false;
        if (session.title === 'New Chat') {
            // Find any enabled API key for title generation (prefer faster/cheaper models)
            const successfulApiKeyEntryForTitle =
                await ApiKey.findOne({ providerName: 'Anthropic', isEnabled: true }) ||
                await ApiKey.findOne({ providerName: 'OpenAI', isEnabled: true }) ||
                await ApiKey.findOne({ providerName: 'DeepSeek', isEnabled: true }) ||
                await ApiKey.findOne({ providerName: 'Gemini', isEnabled: true });

            if (successfulApiKeyEntryForTitle?.keyValue) {
                const titleProvider = successfulApiKeyEntryForTitle.providerName;
                const titleModel = DEFAULT_MODELS[titleProvider]; // Use default model for title
                try {
                    // Refined Prompt 2: Explicitly request ONLY the title in English or Vietnamese
                    const titlePrompt = `Analyze the language of the following message snippet. If the language is Vietnamese, respond ONLY with a concise title (3-5 words max) in Vietnamese. If the language is English or any other language, respond ONLY with a concise title (3-5 words max) in English. Your response must contain ONLY the title text and nothing else. Snippet: \"${textForTitleGen.substring(0, 150)}...\"`;
                    const titleApiKey = successfulApiKeyEntryForTitle.keyValue;
                    // Use non-streaming callApi for title generation
                    // Pass only the titlePrompt as the history/content for this specific call
                    const titleHistory = [{ _id: 'temp-title-user', session: sessionId, sender: 'user', content: titlePrompt, timestamp: new Date().toISOString() }];
                    // Pass titlePrompt as the finalUserMessageContent argument for this specific call
                    const titleResult = await callApi(titleProvider, titleApiKey, titleModel, titleHistory, titlePrompt);
                    generatedTitle = titleResult.content; // Extract content for title

                    if (generatedTitle) {
                        // More robust cleanup: trim, remove quotes/periods, take first line/part, truncate
                        let cleanedTitle = generatedTitle.trim().replace(/^"|"$/g, '').replace(/\.$/, '');
                        // Split by newline or colon and take the first part
                        cleanedTitle = cleanedTitle.split(/[\n:]/)[0].trim();
                        // Truncate to a max length (e.g., 50 chars) as a final safety measure
                        const maxLength = 50;
                        if (cleanedTitle.length > maxLength) {
                            cleanedTitle = cleanedTitle.substring(0, maxLength) + '...';
                        }
                        generatedTitle = cleanedTitle; // Use the cleaned title

                        await ChatSession.findByIdAndUpdate(sessionId, { title: generatedTitle });
                        titleUpdated = true;
                        console.log(`Generated title using ${titleProvider}: ${generatedTitle}`);
                    } else {
                        console.warn(`Could not generate title using ${titleProvider}.`);
                    }
                } catch (titleError) {
                    console.error(`Error generating chat title using ${titleProvider}:`, titleError);
                }
            } else {
                console.warn('Could not generate title: No suitable API key found or enabled.');
            }
        }

        // --- AI Response Generation ---
        // Fetch history *including* the user message we just saved
        const history = await ChatMessage.find({ session: sessionId }).sort({ timestamp: 1 });

        // --- Custom Model Handling Block Removed From Here ---


        if (shouldStream) {
            // --- Streaming Logic ---
            console.log("Processing request with streaming enabled.");
            let providerUsed = null;
            let actualModelUsed = null;
            let finalAiContent = null;
            let finalReasoningContent = ''; // Declare here to keep in scope
            let fullCitations = []; // Declare here to keep in scope
            let streamError = false;

            // --- SSE Setup ---
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            });

            const sendSse = (data) => {
                if (!res.writableEnded) {
                    res.write(`data: ${JSON.stringify(data)}\n\n`);
                } else {
                    console.warn("Attempted to write to closed SSE connection.");
                }
            };

            // --- Send Saved User Message via SSE ---
            // Send the confirmed user message back immediately so frontend can update UI
            sendSse({ type: 'user_message_saved', message: savedUserMessage });
            console.log("Sent user_message_saved SSE event.");
            // --- End Send Saved User Message ---

            try {
                // Use modelIdentifierForApi (base model) for finding provider and making calls
                console.log(`Attempting API call with base model: ${modelIdentifierForApi || 'None (use default)'}`);
                let providerToTry = null;
                let modelToTry = modelIdentifierForApi; // Use the base model identifier here
                let apiKeyToUse = null;

                // 1. Determine initial provider and model (using base model identifier)
                if (modelToTry) {
                    const targetProvider = findProviderForModel(modelToTry); // Find provider for the base model
                    if (targetProvider) {
                        const apiKeyEntry = await ApiKey.findOne({ providerName: targetProvider, isEnabled: true });
                        if (apiKeyEntry?.keyValue) {
                            providerToTry = targetProvider; 
                            // modelToTry is already set to baseModelIdentifier
                            apiKeyToUse = apiKeyEntry.keyValue;
                            console.log(`Streaming: Found key for provider ${providerToTry}. Will try base model ${modelToTry}. System Prompt: ${!!systemPromptForApi}`);
                        } else { console.warn(`Streaming: API key for ${targetProvider} (provider for base model ${modelToTry}) disabled/missing. Falling back...`); }
                    } else { console.warn(`Streaming: Provider for base model ${modelToTry} not found. Falling back...`); }
                } else {
                     console.log("Streaming: No specific model requested or derived. Will proceed to fallback.");
                }

                // 2. Attempt API call (or fallback if needed) - Pass systemPromptForApi and finalUserMessageContentForApi
                if (providerToTry && modelToTry && apiKeyToUse) {
                    // Pass systemPromptForApi and the prepared finalUserMessageContentForApi
                    const result = await callApiStream(providerToTry, apiKeyToUse, modelToTry, history, finalUserMessageContentForApi, sendSse, systemPromptForApi);
                    if (!result.errorOccurred) {
                        providerUsed = providerToTry;
                        actualModelUsed = modelToTry; // Store the base model used for the API call
                        finalAiContent = result.fullResponseContent;
                        finalReasoningContent = result.fullReasoningContent;
                        fullCitations = result.fullCitations; // Capture citations
                        // If successful with custom model's base, keep finalModelNameToSave as the custom ID
                    } else {
                        console.warn(`Streaming: Initial attempt ${providerToTry}/${modelToTry} (Base Model) failed. Trying default for provider...`);
                        finalModelNameToSave = null; // Reset as we are falling back
                        const defaultModelForProvider = DEFAULT_MODELS[providerToTry];
                        if (defaultModelForProvider && defaultModelForProvider !== modelToTry) {
                             // Try default model for the *same provider*, still pass original system prompt if any
                            const defaultResult = await callApiStream(providerToTry, apiKeyToUse, defaultModelForProvider, history, finalUserMessageContentForApi, sendSse, systemPromptForApi);
                            if (!defaultResult.errorOccurred) {
                                providerUsed = providerToTry;
                                actualModelUsed = defaultModelForProvider; // Store the default base model used
                                finalAiContent = defaultResult.fullResponseContent;
                                finalReasoningContent = defaultResult.fullReasoningContent;
                                fullCitations = defaultResult.fullCitations; // Capture citations
                                finalModelNameToSave = actualModelUsed; // Save the default base model name
                            } else { console.warn(`Streaming: Default model ${defaultModelForProvider} for ${providerToTry} also failed. Falling back further...`); }
                        } else { console.warn(`Streaming: No different default model for ${providerToTry}. Falling back further...`); }
                    }
                }

                // 3. Sequential Fallback (if initial attempts failed)
                if (!providerUsed) {
                    finalModelNameToSave = null; // Reset as we are falling back completely
                    console.log("Streaming: Attempting sequential provider fallback...");
                    const enabledKeysSorted = await ApiKey.find({ isEnabled: true }).sort({ priority: 1 });
                    if (!enabledKeysSorted || enabledKeysSorted.length === 0) {
                        console.error("Streaming: No enabled API keys for fallback."); streamError = true; sendSse({ type: 'error', message: 'No enabled API keys available.' });
                    } else {
                        for (const apiKeyEntry of enabledKeysSorted) {
                            const fallbackProvider = apiKeyEntry.providerName;
                            if (providerToTry === fallbackProvider) continue; // Skip if already tried
                            console.log(`Streaming Fallback: Trying ${fallbackProvider} (Priority: ${apiKeyEntry.priority})`);
                            const fallbackModel = DEFAULT_MODELS[fallbackProvider];
                            if (!fallbackModel) continue;
                            // Fallback uses default models, so no custom system prompt is passed
                            // Also, fallback likely won't handle multimodal, so pass text only
                            const fallbackTextContent = typeof finalUserMessageContentForApi === 'string'
                                ? finalUserMessageContentForApi
                                : finalUserMessageContentForApi.find(part => part.type === 'text')?.text || '';
                            const fallbackResult = await callApiStream(fallbackProvider, apiKeyEntry.keyValue, fallbackModel, history, fallbackTextContent, sendSse, null);
                            if (!fallbackResult.errorOccurred) {
                                providerUsed = fallbackProvider;
                                actualModelUsed = fallbackModel; // Store the fallback base model used
                                finalAiContent = fallbackResult.fullResponseContent;
                                finalReasoningContent = fallbackResult.fullReasoningContent;
                                fullCitations = fallbackResult.fullCitations; // Capture citations
                                finalModelNameToSave = actualModelUsed; // Save the fallback base model name
                                console.log(`Streaming Fallback successful: ${providerUsed}/${actualModelUsed}.`);
                                break;
                            } else { console.warn(`Streaming Fallback failed for ${fallbackProvider}.`); }
                        }
                    }
                }

                // 4. Handle final failure
                if (!providerUsed && !streamError) {
                    console.error("Streaming: Failed to get response from any provider."); streamError = true; sendSse({ type: 'error', message: 'Failed to get response from all providers.' });
                }

                // 5. Send initial info and finalize SSE
                // Send the model name/ID that should be displayed/saved (custom ID or base name)
                if (finalModelNameToSave) sendSse({ type: 'model_info', modelUsed: finalModelNameToSave }); 
                if (titleUpdated) sendSse({ type: 'title_update', title: generatedTitle });
                sendSse({ type: 'done' });

            } catch (error) { // Catch errors during streaming setup/logic
                console.error("Error during stream processing:", error); streamError = true;
                if (!res.headersSent) { res.writeHead(500, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ success: false, error: 'Server Error before streaming' })); }
                else if (!res.writableEnded) { sendSse({ type: 'error', message: 'Internal Server Error during stream' }); }
            } finally {
                if (!res.writableEnded) res.end(); // Ensure connection is closed
            }

            // 6. Save final AI message to DB *after* streaming
            // Use finalModelNameToSave (custom ID or base name) for the modelUsed field
            if (!streamError && finalAiContent !== null && finalModelNameToSave) { 
                try {
                    // Add more detailed logging for citations in streaming mode
                    console.log(`Streaming citations before saving: Provider=${providerUsed}, Base Model Used=${actualModelUsed}, Saved Model ID/Name=${finalModelNameToSave}, Citations count=${fullCitations.length}`);
                    if (fullCitations.length > 0) {
                        console.log("Citations to save:", JSON.stringify(fullCitations, null, 2));
                    }
                    
                    const messageToSave = {
                        session: sessionId,
                        sender: 'ai',
                        content: finalAiContent,
                        modelUsed: finalModelNameToSave, // Save custom ID or base name
                        // Only add reasoningContent if it's not empty
                        ...(finalReasoningContent && { reasoningContent: finalReasoningContent }),
                        // Add citations if we have them (not just for Perplexity)
                        ...(fullCitations.length > 0 && { citations: fullCitations })
                    };
                    console.log("Attempting to save AI message (streaming):", JSON.stringify({
                        ...messageToSave,
                        content: messageToSave.content.substring(0, 100) + '...' // Truncate content for log readability
                    }, null, 2));
                    const savedMessage = await ChatMessage.create(messageToSave);
                    console.log("Successfully saved final AI message to DB (streaming). ID:", savedMessage._id); // Log success and ID
                } catch (dbError) {
                    console.error("!!! Error saving final AI message to DB (streaming):", dbError); // Make error more prominent
                }
            } else if (!streamError && finalAiContent === null) {
                console.warn("Streaming finished, but final AI content was null. Not saving to DB.");
            } else if (streamError) {
                 console.warn("Stream ended with error, not saving AI message to DB.");
            }

        } else {
            // --- Non-Streaming Logic ---
            console.log("Processing request with streaming disabled.");
            let apiResult = null; // Will hold { content, citations }
            let providerUsed = null;
            let actualModelUsed = null;

            // Use modelIdentifierForApi (base model) for finding provider and making calls
            console.log(`Attempting API call with base model: ${modelIdentifierForApi || 'None (use default)'}`);
            let providerToTry = null;
            let modelToTry = modelIdentifierForApi; // Use the base model identifier here
            let apiKeyToUse = null;

            // 1. Determine initial provider and model (using base model identifier)
             if (modelToTry) {
                const targetProvider = findProviderForModel(modelToTry); // Find provider for the base model
                if (targetProvider) {
                    const apiKeyEntry = await ApiKey.findOne({ providerName: targetProvider, isEnabled: true });
                    if (apiKeyEntry?.keyValue) {
                        providerToTry = targetProvider;
                        // modelToTry is already set to baseModelIdentifier
                        apiKeyToUse = apiKeyEntry.keyValue;
                        console.log(`Non-Streaming: Found key for provider ${providerToTry}. Will try base model ${modelToTry}. System Prompt: ${!!systemPromptForApi}`);
                    } else { console.warn(`Non-Streaming: API key for ${targetProvider} (provider for base model ${modelToTry}) disabled/missing. Falling back...`); }
                } else { console.warn(`Non-Streaming: Provider for base model ${modelToTry} not found. Falling back...`); }
            } else {
                 console.log("Non-Streaming: No specific model requested or derived. Will proceed to fallback.");
            }


            // 2. Attempt API call (or fallback if needed) - Pass systemPromptForApi and finalUserMessageContentForApi
            if (providerToTry && modelToTry && apiKeyToUse) {
                // Pass systemPromptForApi and the prepared finalUserMessageContentForApi
                apiResult = await callApi(providerToTry, apiKeyToUse, modelToTry, history, finalUserMessageContentForApi, systemPromptForApi);
                if (apiResult && apiResult.content !== null) {
                    providerUsed = providerToTry;
                    actualModelUsed = modelToTry; // Store the base model used for the API call
                    // If successful with custom model's base, keep finalModelNameToSave as the custom ID
                    console.log(`Non-Streaming: Success ${providerUsed}/${actualModelUsed} (Base Model)`);
                } else {
                    console.warn(`Non-Streaming: Initial attempt ${providerToTry}/${modelToTry} (Base Model) failed. Trying default for provider...`);
                    finalModelNameToSave = null; // Reset as we are falling back
                    const defaultModelForProvider = DEFAULT_MODELS[providerToTry];
                    if (defaultModelForProvider && defaultModelForProvider !== modelToTry) {
                        // Try default model for the *same provider*, still pass original system prompt if any
                        apiResult = await callApi(providerToTry, apiKeyToUse, defaultModelForProvider, history, finalUserMessageContentForApi, systemPromptForApi);
                        if (apiResult && apiResult.content !== null) {
                            providerUsed = providerToTry;
                            actualModelUsed = defaultModelForProvider; // Store the default base model used
                            finalModelNameToSave = actualModelUsed; // Save the default base model name
                            console.log(`Non-Streaming: Success ${providerUsed}/DEFAULT ${actualModelUsed}`);
                        } else { console.warn(`Non-Streaming: Default model ${defaultModelForProvider} for ${providerToTry} also failed. Falling back further...`); }
                    } else { console.warn(`Non-Streaming: No different default model for ${providerToTry}. Falling back further...`); }
                }
            }

            // 3. Sequential Fallback
            if (!providerUsed) {
                console.log("Non-Streaming: Attempting sequential provider fallback...");
                const enabledKeysSorted = await ApiKey.find({ isEnabled: true }).sort({ priority: 1 });
                if (!enabledKeysSorted || enabledKeysSorted.length === 0) {
                    console.error("Non-Streaming: No enabled API keys for fallback.");
                    apiResult = { content: 'Sorry, no API providers are available.', citations: null }; // Provide default error content
                } else {
                    for (const apiKeyEntry of enabledKeysSorted) {
                        const fallbackProvider = apiKeyEntry.providerName;
                        if (providerToTry === fallbackProvider) continue;
                        console.log(`Non-Streaming Fallback: Trying ${fallbackProvider} (Priority: ${apiKeyEntry.priority})`);
                        const fallbackModel = DEFAULT_MODELS[fallbackProvider];
                        if (!fallbackModel) continue;
                        // Fallback uses default models, so no custom system prompt is passed
                        // Also, fallback likely won't handle multimodal, so pass text only
                        const fallbackTextContent = typeof finalUserMessageContentForApi === 'string'
                            ? finalUserMessageContentForApi
                            : finalUserMessageContentForApi.find(part => part.type === 'text')?.text || '';
                        apiResult = await callApi(fallbackProvider, apiKeyEntry.keyValue, fallbackModel, history, fallbackTextContent);
                        if (apiResult && apiResult.content !== null) {
                            providerUsed = fallbackProvider; actualModelUsed = fallbackModel;
                            console.log(`Non-Streaming Fallback successful: ${providerUsed}/${actualModelUsed}.`);
                            break;
                        } else { console.warn(`Non-Streaming Fallback failed for ${fallbackProvider}.`); }
                    }
                }
            }

            // 4. Handle final failure
            if (!providerUsed) {
                console.error("Non-Streaming: Failed to get response from any provider.");
                // Ensure apiResult has a default error content if it's still null
                if (!apiResult || apiResult.content === null) {
                    apiResult = { content: 'Sorry, I could not process that request.', citations: null };
                }
            }

            // Check if we got a valid response content
            if (!apiResult || apiResult.content === null) {
                 console.error("Non-Streaming: Final AI response content is null. Sending error response.");
                 return res.status(500).json({ success: false, error: 'Failed to get AI response' });
            }

            // 5. Save the AI's response message
            const aiMessageData = {
                session: sessionId,
                sender: 'ai',
                content: apiResult.content, // Use content from the result object
                modelUsed: actualModelUsed,
                // Add citations if they exist in the result object
                ...(apiResult.citations && apiResult.citations.length > 0 && { citations: apiResult.citations })
            };
            
            // Debug log the message data before saving
            console.log('Saving AI message with data:', JSON.stringify({
                content: apiResult.content?.substring(0, 100) + '...',
                modelUsed: actualModelUsed,
                hasCitations: apiResult.citations && apiResult.citations.length > 0,
                citationsCount: apiResult.citations?.length || 0
            }, null, 2));

            const aiMessage = await ChatMessage.create(aiMessageData);
            console.log("Successfully saved final AI message to DB (non-streaming).");
            
            // Debug log the saved message to verify citations were saved
            console.log('Saved message ID:', aiMessage._id);
            console.log('Saved message has citations:', !!aiMessage.citations);
            console.log('Saved citations count:', aiMessage.citations?.length || 0);

            // 6. Send back the single AI response AND the saved user message
            res.status(201).json({
              success: true,
              userMessage: savedUserMessage, // Include the saved user message
              data: aiMessage, // Keep AI response as 'data'
              ...(titleUpdated && { updatedSessionTitle: generatedTitle }) // Include title if updated
            });
        } // End of non-streaming block

    } catch (error) { // Catch errors common to both streaming/non-streaming setup
        console.error("Add Message Error (Outer Catch):", error);
        if (error.name === 'CastError') return res.status(404).json({ success: false, error: `Chat session not found with id ${req.params.sessionId}` });
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, error: messages });
        }
        // Log the detailed error before sending the generic 500 response
        console.error("Unhandled Add Message Error:", error);
        // Avoid sending response if headers already sent (e.g., during streaming)
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Server Error adding message' });
        } else {
            console.error("Headers already sent, cannot send 500 error response.");
        }
    }
};
