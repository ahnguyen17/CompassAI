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
    'DeepSeek': [ // Added DeepSeek
        "deepseek-chat",
        "deepseek-coder",
        "deepseek-reasoner" // Added new model
    ],
    'Perplexity': [ // Added Perplexity to match providers.js
        "perplexity/sonar-deep-research",
        "perplexity/sonar-reasoning-pro",
        "perplexity/sonar-reasoning",
        "perplexity/sonar-pro",
        "perplexity/sonar",
        "perplexity/r1-1776"
    ]
};

// Define default models per provider
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
        if (models.includes(modelName)) return provider;
    }

    return null;
};

// Helper function to format message history for different providers
const formatMessagesForProvider = (providerName, history, combinedContentForAI) => {
    const historyForProvider = history.map((msg, index) => {
        // Use combinedContentForAI only for the very last user message being sent now
        const isLastUserMessage = index === history.length - 1 && msg.sender === 'user';
        const messageContent = isLastUserMessage ? combinedContentForAI : msg.content;

        // Skip empty messages unless it's the last user message (which might just be a file)
        if (!messageContent && !isLastUserMessage) return null;

        // DeepSeek and Perplexity use OpenAI format
        if (providerName === 'Anthropic' || providerName === 'OpenAI' || providerName === 'DeepSeek' || providerName === 'Perplexity')
            return { role: msg.sender === 'user' ? 'user' : 'assistant', content: messageContent || "" }; // Ensure content is at least ""
        if (providerName === 'Gemini')
            return { role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: messageContent || "" }] }; // Ensure text is at least ""
        return null;
    }).filter(Boolean); // Remove null entries

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
const callApi = async (providerName, apiKey, modelToUse, history, combinedContentForAI) => {
    let aiResponseContent = null;
    let extractedCitations = null; // Initialize citations as null
    // Pass the *full* history including the latest user message for formatting
    const formattedMessages = formatMessagesForProvider(providerName, history, combinedContentForAI);

    try {
        console.log(`Calling ${providerName} with model ${modelToUse} (Non-Streaming)`);
        if (providerName === 'Anthropic') {
            const anthropic = new Anthropic({ apiKey });
            const msg = await anthropic.messages.create({
                model: modelToUse,
                max_tokens: 1024,
                messages: formattedMessages
            });
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

            const completion = await client.chat.completions.create({
                model: actualModelName,
                messages: formattedMessages,
                // Add parameters to request citations for Perplexity
                ...(providerName === 'Perplexity' && {
                    extra_params: {
                        citations: true
                    }
                })
            });
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
            const model = genAI.getGenerativeModel({ model: modelToUse });
            // Gemini requires history and the last message separately for chat.sendMessage
            const chatHistoryForGemini = formattedMessages.slice(0, -1);
            const lastUserMessageParts = formattedMessages[formattedMessages.length - 1].parts;
            const chat = model.startChat({ history: chatHistoryForGemini });
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
const callApiStream = async (providerName, apiKey, modelToUse, history, combinedContentForAI, sendSse) => {
    let fullResponseContent = ''; // Accumulate full response
    let fullReasoningContent = ''; // Accumulate reasoning content
    let fullCitations = []; // Store citations for later use
    let errorOccurred = false;
    // Pass the *full* history including the latest user message for formatting
    const formattedMessages = formatMessagesForProvider(providerName, history, combinedContentForAI);

    try {
        console.log(`Calling ${providerName} with model ${modelToUse} for streaming...`);

        if (providerName === 'Anthropic') {
            const anthropic = new Anthropic({ apiKey });
            const stream = await anthropic.messages.stream({
                model: modelToUse,
                max_tokens: 1024,
                messages: formattedMessages
            });

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

            // For Perplexity, we need to use a different approach to request citations in streaming mode
            let requestOptions = {
                model: actualModelName,
                messages: formattedMessages,
                stream: true
            };
            
            // Add citations parameter directly for Perplexity
            if (providerName === 'Perplexity') {
                console.log('Adding citations parameter for Perplexity streaming request');
                // Try different approaches to request citations
                requestOptions.citations = true; // Direct approach
            }
            
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
                                    const fullResponse = await client.chat.completions.create({
                                        model: actualModelName,
                                        messages: formattedMessages,
                                        // Add parameters to request citations
                                        ...(providerName === 'Perplexity' && {
                                            extra_params: {
                                                citations: true
                                            }
                                        })
                                    });

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
            const model = genAI.getGenerativeModel({ model: modelToUse });
            // Gemini stream API takes the full message list directly
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

        // Prepare combined content for AI (including potential file content)
        let combinedContentForAI = content || '';
        if (uploadedFile) {
            let fileTextContent = `[File Uploaded: ${uploadedFile.originalname} (${(uploadedFile.size / 1024).toFixed(1)} KB)]`;
            if (uploadedFile.mimetype === 'application/pdf') {
                try {
                    // Use the original path for reading the file
                    console.log(`Attempting to read PDF: ${uploadedFile.path}`);
                    const dataBuffer = fs.readFileSync(uploadedFile.path);
                    console.log(`Read PDF buffer, attempting to parse...`);
                    const pdfData = await pdf(dataBuffer);
                    console.log(`Parsed PDF successfully.`);
                    const maxChars = 5000; // Limit extracted text length
                    const extractedText = pdfData.text.substring(0, maxChars);
                    fileTextContent = `\n\n--- Start of PDF Content (${uploadedFile.originalname}) ---\n${extractedText}${pdfData.text.length > maxChars ? '\n[...content truncated]' : ''}\n--- End of PDF Content ---`;
                } catch (pdfError) {
                    console.error("Error processing PDF:", pdfError);
                    fileTextContent = `\n\n[File Uploaded: ${uploadedFile.originalname} - Error processing PDF content]`;
                }
            }
            // Add file info/content AFTER any user text content
            combinedContentForAI = combinedContentForAI ? `${combinedContentForAI}\n${fileTextContent}` : fileTextContent;
        }

        // --- Auto-generate Title (if needed) ---
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
                    const titlePrompt = `Generate a very concise title (3-5 words max) for a chat that starts with this message: "${combinedContentForAI.substring(0, 100)}..."`; // Use snippet
                    const titleApiKey = successfulApiKeyEntryForTitle.keyValue;
                    // Use non-streaming callApi for title generation
                    // Pass only the titlePrompt as the history/content for this specific call
                    const titleHistory = [{ _id: 'temp-title-user', sender: 'user', content: titlePrompt, timestamp: new Date().toISOString() }];
                    // Pass titlePrompt as the last message content argument
                    // callApi now returns an object { content, citations }
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

            try {
                console.log(`User requested model: ${requestedModel || 'None (use default)'}`);
                let providerToTry = null;
                let modelToTry = null;
                let apiKeyToUse = null;

                // 1. Determine initial provider and model
                if (requestedModel) {
                    const targetProvider = findProviderForModel(requestedModel);
                    if (targetProvider) {
                        const apiKeyEntry = await ApiKey.findOne({ providerName: targetProvider, isEnabled: true });
                        if (apiKeyEntry?.keyValue) {
                            providerToTry = targetProvider; modelToTry = requestedModel; apiKeyToUse = apiKeyEntry.keyValue;
                            console.log(`Streaming: Found key for requested provider ${providerToTry}. Will try model ${modelToTry}.`);
                        } else { console.warn(`Streaming: API key for ${targetProvider} disabled/missing. Falling back...`); }
                    } else { console.warn(`Streaming: Requested model ${requestedModel} not found. Falling back...`); }
                }

                // 2. Attempt API call (or fallback if needed)
                if (providerToTry && modelToTry && apiKeyToUse) {
                    const result = await callApiStream(providerToTry, apiKeyToUse, modelToTry, history, combinedContentForAI, sendSse);
                    if (!result.errorOccurred) {
                        providerUsed = providerToTry;
                        actualModelUsed = modelToTry;
                        finalAiContent = result.fullResponseContent;
                        finalReasoningContent = result.fullReasoningContent;
                        fullCitations = result.fullCitations; // Capture citations
                    } else {
                        console.warn(`Streaming: Initial attempt ${providerToTry}/${modelToTry} failed. Trying default...`);
                        const defaultModelForProvider = DEFAULT_MODELS[providerToTry];
                        if (defaultModelForProvider && defaultModelForProvider !== modelToTry) {
                            const defaultResult = await callApiStream(providerToTry, apiKeyToUse, defaultModelForProvider, history, combinedContentForAI, sendSse);
                            if (!defaultResult.errorOccurred) {
                                providerUsed = providerToTry;
                                actualModelUsed = defaultModelForProvider;
                                finalAiContent = defaultResult.fullResponseContent;
                                finalReasoningContent = defaultResult.fullReasoningContent;
                                fullCitations = defaultResult.fullCitations; // Capture citations
                            } else { console.warn(`Streaming: Default model ${defaultModelForProvider} for ${providerToTry} also failed. Falling back...`); }
                        } else { console.warn(`Streaming: No different default model for ${providerToTry}. Falling back...`); }
                    }
                }

                // 3. Sequential Fallback
                if (!providerUsed) {
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
                            const fallbackResult = await callApiStream(fallbackProvider, apiKeyEntry.keyValue, fallbackModel, history, combinedContentForAI, sendSse);
                            if (!fallbackResult.errorOccurred) {
                                providerUsed = fallbackProvider;
                                actualModelUsed = fallbackModel;
                                finalAiContent = fallbackResult.fullResponseContent;
                                finalReasoningContent = fallbackResult.fullReasoningContent;
                                fullCitations = fallbackResult.fullCitations; // Capture citations
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
                if (actualModelUsed) sendSse({ type: 'model_info', modelUsed: actualModelUsed });
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
            if (!streamError && finalAiContent !== null && actualModelUsed) {
                try {
                    // Add more detailed logging for citations in streaming mode
                    console.log(`Streaming citations before saving: Provider=${providerUsed}, Citations count=${fullCitations.length}`);
                    if (fullCitations.length > 0) {
                        console.log("Citations to save:", JSON.stringify(fullCitations, null, 2));
                    }
                    
                    const messageToSave = {
                        session: sessionId,
                        sender: 'ai',
                        content: finalAiContent,
                        modelUsed: actualModelUsed,
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

            console.log(`User requested model: ${requestedModel || 'None (use default)'}`);
            let providerToTry = null;
            let modelToTry = null;
            let apiKeyToUse = null;

            // 1. Determine initial provider and model
            if (requestedModel) {
                const targetProvider = findProviderForModel(requestedModel);
                if (targetProvider) {
                    const apiKeyEntry = await ApiKey.findOne({ providerName: targetProvider, isEnabled: true });
                    if (apiKeyEntry?.keyValue) {
                        providerToTry = targetProvider; modelToTry = requestedModel; apiKeyToUse = apiKeyEntry.keyValue;
                        console.log(`Non-Streaming: Found key for requested provider ${providerToTry}. Will try model ${modelToTry}.`);
                    } else { console.warn(`Non-Streaming: API key for ${targetProvider} disabled/missing. Falling back...`); }
                } else { console.warn(`Non-Streaming: Requested model ${requestedModel} not found. Falling back...`); }
            }

            // 2. Attempt API call (or fallback if needed)
            if (providerToTry && modelToTry && apiKeyToUse) {
                apiResult = await callApi(providerToTry, apiKeyToUse, modelToTry, history, combinedContentForAI);
                if (apiResult && apiResult.content !== null) {
                    providerUsed = providerToTry; actualModelUsed = modelToTry;
                    console.log(`Non-Streaming: Success ${providerUsed}/${actualModelUsed}`);
                } else {
                    console.warn(`Non-Streaming: Initial attempt ${providerToTry}/${modelToTry} failed. Trying default...`);
                    const defaultModelForProvider = DEFAULT_MODELS[providerToTry];
                    if (defaultModelForProvider && defaultModelForProvider !== modelToTry) {
                        apiResult = await callApi(providerToTry, apiKeyToUse, defaultModelForProvider, history, combinedContentForAI);
                        if (apiResult && apiResult.content !== null) {
                            providerUsed = providerToTry; actualModelUsed = defaultModelForProvider;
                            console.log(`Non-Streaming: Success ${providerUsed}/DEFAULT ${actualModelUsed}`);
                        } else { console.warn(`Non-Streaming: Default model ${defaultModelForProvider} for ${providerToTry} also failed. Falling back...`); }
                    } else { console.warn(`Non-Streaming: No different default model for ${providerToTry}. Falling back...`); }
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
                        apiResult = await callApi(fallbackProvider, apiKeyEntry.keyValue, fallbackModel, history, combinedContentForAI);
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

            // 6. Send back the single AI response
            res.status(201).json({
              success: true,
              data: aiMessage,
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
