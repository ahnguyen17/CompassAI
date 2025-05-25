// Import SDKs
const Anthropic = require('@anthropic-ai/sdk');
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs'); // Keep for now, might be used by some text extractors if they don't take buffers
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid'); // For generating unique S3 keys
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const WordExtractor = require('word-extractor');
const XLSX = require('xlsx');
// const util = require('util'); // No longer needed for pptxto.txt

// Import Models
const ChatMessage = require('../models/ChatMessage');
const ChatSession = require('../models/ChatSession');
const ApiKey = require('../models/ApiKey');
const CustomModel = require('../models/CustomModel'); // Import CustomModel
const UserMemory = require('../models/UserMemory'); // Import UserMemory model
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

// Instantiate WordExtractor
const wordExtractor = new WordExtractor();

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
        // Add useSessionMemory, default to true if not provided
        const { content, model: requestedModel, useSessionMemory = true } = req.body; 
        const uploadedFile = req.file;
        const shouldStream = req.body.stream !== 'false'; // Default to streaming unless explicitly disabled

        console.log(`Received request: content='${content}', file=${uploadedFile?.originalname}, model='${requestedModel}', stream=${shouldStream}`);

        // Initialize S3 client
        let s3Client;
        try {
            s3Client = new S3Client({
                region: process.env.AWS_S3_REGION,
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                },
            });
            console.log("S3 client initialized successfully.");
        } catch (s3Error) {
            console.error("Failed to initialize S3 client:", s3Error);
            return res.status(500).json({ success: false, error: 'Server Error: S3 client initialization failed.' });
        }

        if (!content && !uploadedFile) return res.status(400).json({
            success: false,
            error: 'Message content or a file upload is required.'
        });

        let session = await ChatSession.findById(sessionId); // Use 'let' to allow re-assignment
        if (!session) return res.status(404).json({
            success: false,
            error: `Chat session not found with id ${sessionId}`
        });

        if (session.user.toString() !== req.user.id) return res.status(403).json({
            success: false,
            error: 'User not authorized'
        });

        // Update lastAccessedAt when a message is added (interacted)
        // This will be updated again later if an AI message is successfully generated
        session.lastAccessedAt = Date.now(); 
        // We will update lastMessageTimestamp after the user message is saved.
        await session.save(); // Save initial lastAccessedAt update
        console.log(`Updated lastAccessedAt for session ${sessionId} on message add (pre-user message save).`);

        // Prepare and save user message data
        let s3FileUrl = null;
        let s3ObjectKey = null;

        if (uploadedFile) {
            console.log(`Processing uploaded file: ${uploadedFile.originalname}, size: ${uploadedFile.size}, mimetype: ${uploadedFile.mimetype}`);
            const fileExtension = path.extname(uploadedFile.originalname);
            s3ObjectKey = `uploads/${uuidv4()}${fileExtension}`; // Generate a unique key with 'uploads/' prefix

            const putObjectParams = {
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: s3ObjectKey,
                Body: uploadedFile.buffer, // Assuming multer.memoryStorage() is used
                ContentType: uploadedFile.mimetype,
                ACL: 'public-read',
            };

            try {
                console.log(`Attempting to upload to S3: Bucket=${putObjectParams.Bucket}, Key=${putObjectParams.Key}`);
                await s3Client.send(new PutObjectCommand(putObjectParams));
                s3FileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${s3ObjectKey}`;
                console.log(`File successfully uploaded to S3. URL: ${s3FileUrl}`);
            } catch (s3UploadError) {
                console.error("Error uploading file to S3:", s3UploadError);
                return res.status(500).json({ success: false, error: 'Failed to upload file to S3.' });
            }
        }

        const userMessageData = {
            session: sessionId,
            sender: 'user',
            content: content || '', // Save empty string if no text content
            timestamp: new Date(), // Ensure timestamp is a Date object
            fileInfo: uploadedFile ? {
                filename: s3ObjectKey, 
                originalname: uploadedFile.originalname,
                mimetype: uploadedFile.mimetype,
                size: uploadedFile.size,
                path: s3FileUrl 
            } : undefined
        };

        const savedUserMessage = await ChatMessage.create(userMessageData);
        console.log("Saved user message to DB:", savedUserMessage._id);

        // Update ChatSession's lastMessageTimestamp and lastAccessedAt to the user message's timestamp
        session.lastMessageTimestamp = savedUserMessage.timestamp;
        session.lastAccessedAt = savedUserMessage.timestamp; 
        await session.save();
        console.log(`Updated session ${sessionId} lastMessageTimestamp & lastAccessedAt to user message time: ${savedUserMessage.timestamp}`);

        // --- Determine Model Identifiers and System Prompt ---
        let customModelData = null;
        let modelIdentifierForApi = requestedModel; 
        let systemPromptForApi = null;
        let finalModelNameToSave = requestedModel; 

        if (requestedModel && mongoose.Types.ObjectId.isValid(requestedModel)) {
            customModelData = await CustomModel.findById(requestedModel);
            if (customModelData) {
                modelIdentifierForApi = customModelData.baseModelIdentifier; 
                systemPromptForApi = customModelData.systemPrompt; 
                finalModelNameToSave = requestedModel; 
            } else {
                modelIdentifierForApi = requestedModel; 
                finalModelNameToSave = requestedModel;
            }
        } else {
             modelIdentifierForApi = requestedModel; 
             finalModelNameToSave = requestedModel;
        }
        
        // --- Prepare User Memory Context ---
        let memoryContextForPrompt = "";
        if (req.user && req.user.id) { 
            const userMemory = await UserMemory.findOne({ userId: req.user.id });
            if (userMemory && userMemory.isGloballyEnabled && useSessionMemory) { 
                if (userMemory.contexts && userMemory.contexts.length > 0) {
                    const sortedContexts = [...userMemory.contexts].sort((a, b) => 
                        (b.updatedAt || b.createdAt).getTime() - (a.updatedAt || a.createdAt).getTime()
                    );
                    const contextsToUse = sortedContexts.slice(0, Math.min(10, userMemory.maxContexts)); 
                    if (contextsToUse.length > 0) {
                        memoryContextForPrompt = "Relevant information about you based on past interactions:\n" +
                                                contextsToUse.map(c => `- ${c.text}`).join("\n") +
                                                "\n\n---\n\n"; 
                    }
                }
            }
        }
        if (memoryContextForPrompt) {
            systemPromptForApi = systemPromptForApi ? memoryContextForPrompt + systemPromptForApi : memoryContextForPrompt;
        }

        // --- Prepare Content for AI (Text + Optional Image) ---
        let finalUserMessageContentForApi; 
        const userTextContent = content || ''; 
        const isVisionModel = modelSupportsVision(modelIdentifierForApi); 
        const isImageFile = uploadedFile && uploadedFile.mimetype.startsWith('image/');

        if (isImageFile && isVisionModel) {
            try {
                const imageBuffer = uploadedFile.buffer; 
                const base64Image = imageBuffer.toString('base64');
                const mimeType = uploadedFile.mimetype;
                const providerForVision = findProviderForModel(modelIdentifierForApi); 

                if (providerForVision === 'OpenAI' || providerForVision === 'Perplexity') {
                    finalUserMessageContentForApi = [
                        { type: "text", text: userTextContent || "Analyze this image." }, 
                        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                    ];
                } else if (providerForVision === 'Anthropic') {
                    finalUserMessageContentForApi = [
                        { type: "image", source: { type: "base64", media_type: mimeType, data: base64Image } },
                        { type: "text", text: userTextContent || "Analyze this image." } 
                    ];
                } else if (providerForVision === 'Gemini') {
                    finalUserMessageContentForApi = [
                        { text: userTextContent || "Analyze this image." }, 
                        { inlineData: { mimeType: mimeType, data: base64Image } }
                    ];
                } else {
                    finalUserMessageContentForApi = userTextContent;
                }
            } catch (imageError) {
                finalUserMessageContentForApi = userTextContent + `\n\n[Error processing uploaded image: ${uploadedFile.originalname}]`;
            }
        } else {
             let combinedTextContent = userTextContent;
             if (uploadedFile && !isImageFile) { 
                 let fileTextContent = `[File Uploaded: ${uploadedFile.originalname} (${(uploadedFile.size / 1024).toFixed(1)} KB)]`;
                 const dataBuffer = uploadedFile.buffer;
                 if (uploadedFile.mimetype === 'application/pdf') {
                     try {
                         const pdfData = await pdf(dataBuffer); 
                         const maxChars = 5000; 
                         const extractedText = pdfData.text.substring(0, maxChars);
                         fileTextContent = `\n\n--- Start of PDF Content (${uploadedFile.originalname}) ---\n${extractedText}${pdfData.text.length > maxChars ? '\n[...content truncated]' : ''}\n--- End of PDF Content ---`;
                     } catch (pdfError) { fileTextContent = `\n\n[File Uploaded: ${uploadedFile.originalname} - Error processing PDF content]`; }
                 }
                 else if (uploadedFile.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                    try {
                        const result = await mammoth.extractRawText({ buffer: dataBuffer });
                        const maxChars = 10000; 
                        const extractedText = result.value.substring(0, maxChars);
                        fileTextContent = `\n\n--- Start of DOCX Content (${uploadedFile.originalname}) ---\n${extractedText}${result.value.length > maxChars ? '\n[...content truncated]' : ''}\n--- End of DOCX Content ---`;
                    } catch (docxError) { fileTextContent = `\n\n[File Uploaded: ${uploadedFile.originalname} - Error processing DOCX content]`; }
                 }
                 else if (uploadedFile.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || uploadedFile.mimetype === 'application/vnd.ms-excel') {
                    try {
                        const workbook = XLSX.read(dataBuffer, { type: 'buffer' });
                        let fullExtractedText = ""; let totalChars = 0; const overallMaxChars = 15000; 
                        for (const sheetName of workbook.SheetNames) {
                            if (totalChars >= overallMaxChars) break;
                            if (workbook.SheetNames.length > 1) {
                                const sheetHeader = `\n--- Content from Sheet: ${sheetName} ---\n`;
                                if (totalChars + sheetHeader.length > overallMaxChars) break; 
                                fullExtractedText += sheetHeader; totalChars += sheetHeader.length;
                            }
                            const sheet = workbook.Sheets[sheetName];
                            const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
                            for (const row of sheetData) {
                                if (totalChars >= overallMaxChars) break; let rowText = "";
                                for (const cell of row) {
                                    if (totalChars >= overallMaxChars) break; let cellText = "";
                                    if (cell && typeof cell === 'string' && cell.trim() !== "") cellText = cell.trim() + " ";
                                    else if (cell && typeof cell === 'number') cellText = cell.toString() + " ";
                                    if (totalChars + cellText.length > overallMaxChars) { cellText = cellText.substring(0, overallMaxChars - totalChars); rowText += cellText; totalChars = overallMaxChars; break; }
                                    rowText += cellText; totalChars += cellText.length;
                                }
                                fullExtractedText += rowText.trimRight() + "\n"; 
                                if (totalChars >= overallMaxChars) break;
                            }
                        }
                        if (totalChars >= overallMaxChars) fullExtractedText += "\n[...Excel content truncated due to overall size limit]";
                        fileTextContent = `\n\n--- Start of Excel Content (${uploadedFile.originalname}) ---\n${fullExtractedText.trim()}\n--- End of Excel Content ---`;
                    } catch (excelError) { fileTextContent = `\n\n[File Uploaded: ${uploadedFile.originalname} - Error processing Excel content]`;}
                 }
                 combinedTextContent = combinedTextContent ? `${combinedTextContent}\n${fileTextContent}` : fileTextContent;
             } else if (uploadedFile && isImageFile && !isVisionModel) {
                 combinedTextContent += `\n\n[Image Uploaded: ${uploadedFile.originalname}]`;
             }
             finalUserMessageContentForApi = combinedTextContent;
        }
        
        let generatedTitle = null;
        let titleUpdated = false;
        if (session.title === 'New Chat') {
            const successfulApiKeyEntryForTitle =
                await ApiKey.findOne({ providerName: 'Anthropic', isEnabled: true }) ||
                await ApiKey.findOne({ providerName: 'OpenAI', isEnabled: true }) ||
                await ApiKey.findOne({ providerName: 'DeepSeek', isEnabled: true }) ||
                await ApiKey.findOne({ providerName: 'Gemini', isEnabled: true });
            if (successfulApiKeyEntryForTitle?.keyValue) {
                const titleProvider = successfulApiKeyEntryForTitle.providerName;
                const titleModel = DEFAULT_MODELS[titleProvider]; 
                try {
                    const textForTitleGen = typeof finalUserMessageContentForApi === 'string' ? finalUserMessageContentForApi : (finalUserMessageContentForApi.find(part => part.type === 'text') || {text:''}).text;
                    const titlePrompt = `Analyze the language of the following message snippet. If the language is Vietnamese, respond ONLY with a concise title (3-5 words max) in Vietnamese. If the language is English or any other language, respond ONLY with a concise title (3-5 words max) in English. Your response must contain ONLY the title text and nothing else. Snippet: \"${textForTitleGen.substring(0, 150)}...\"`;
                    const titleApiKey = successfulApiKeyEntryForTitle.keyValue;
                    const titleHistory = [{ _id: 'temp-title-user', session: sessionId, sender: 'user', content: titlePrompt, timestamp: new Date().toISOString() }];
                    const titleResult = await callApi(titleProvider, titleApiKey, titleModel, titleHistory, titlePrompt);
                    generatedTitle = titleResult.content; 
                    if (generatedTitle) {
                        let cleanedTitle = generatedTitle.trim().replace(/^"|"$/g, '').replace(/\.$/, '');
                        cleanedTitle = cleanedTitle.split(/[\n:]/)[0].trim();
                        const maxLength = 50;
                        if (cleanedTitle.length > maxLength) cleanedTitle = cleanedTitle.substring(0, maxLength) + '...';
                        generatedTitle = cleanedTitle; 
                        session.title = generatedTitle; // Update session object in memory
                        await ChatSession.findByIdAndUpdate(sessionId, { title: generatedTitle }); // Update in DB
                        titleUpdated = true;
                    }
                } catch (titleError) { console.error(`Error generating chat title:`, titleError); }
            }
        }

        const history = await ChatMessage.find({ session: sessionId }).sort({ timestamp: 1 });

        if (shouldStream) {
            console.log("Processing request with streaming enabled.");
            let providerUsed = null; let actualModelUsed = null; let finalAiContent = null;
            let finalReasoningContent = ''; let fullCitations = []; let streamError = false;
            res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
            const sendSse = (data) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`); };
            
            sendSse({ type: 'user_message_saved', message: savedUserMessage });
            if (titleUpdated) sendSse({ type: 'title_update', title: generatedTitle, sessionId: sessionId, lastAccessedAt: session.lastAccessedAt, lastMessageTimestamp: session.lastMessageTimestamp });

            let currentSessionForDoneEvent = session; // Use the session potentially updated with a new title

            try {
                let providerToTry = null; let modelToTry = modelIdentifierForApi; let apiKeyToUse = null;
                if (modelToTry) {
                    const targetProvider = findProviderForModel(modelToTry);
                    if (targetProvider) {
                        const apiKeyEntry = await ApiKey.findOne({ providerName: targetProvider, isEnabled: true });
                        if (apiKeyEntry?.keyValue) { providerToTry = targetProvider; apiKeyToUse = apiKeyEntry.keyValue; }
                    }
                }
                if (providerToTry && modelToTry && apiKeyToUse) {
                    const result = await callApiStream(providerToTry, apiKeyToUse, modelToTry, history, finalUserMessageContentForApi, sendSse, systemPromptForApi);
                    if (!result.errorOccurred) {
                        providerUsed = providerToTry; actualModelUsed = modelToTry; finalAiContent = result.fullResponseContent;
                        finalReasoningContent = result.fullReasoningContent; fullCitations = result.fullCitations;
                    } else {
                        finalModelNameToSave = null; const defaultModelForProvider = DEFAULT_MODELS[providerToTry];
                        if (defaultModelForProvider && defaultModelForProvider !== modelToTry) {
                            const defaultResult = await callApiStream(providerToTry, apiKeyToUse, defaultModelForProvider, history, finalUserMessageContentForApi, sendSse, systemPromptForApi);
                            if (!defaultResult.errorOccurred) {
                                providerUsed = providerToTry; actualModelUsed = defaultModelForProvider; finalAiContent = defaultResult.fullResponseContent;
                                finalReasoningContent = defaultResult.fullReasoningContent; fullCitations = defaultResult.fullCitations; finalModelNameToSave = actualModelUsed;
                            }
                        }
                    }
                }
                if (!providerUsed) {
                    finalModelNameToSave = null; 
                    const enabledKeysSorted = await ApiKey.find({ isEnabled: true }).sort({ priority: 1 });
                    if (!enabledKeysSorted || enabledKeysSorted.length === 0) { streamError = true; sendSse({ type: 'error', message: 'No enabled API keys available.' });
                    } else {
                        for (const apiKeyEntry of enabledKeysSorted) {
                            const fallbackProvider = apiKeyEntry.providerName; if (providerToTry === fallbackProvider) continue;
                            const fallbackModel = DEFAULT_MODELS[fallbackProvider]; if (!fallbackModel) continue;
                            const fallbackTextContent = typeof finalUserMessageContentForApi === 'string' ? finalUserMessageContentForApi : (finalUserMessageContentForApi.find(part => part.type === 'text')||{text:''}).text;
                            const fallbackResult = await callApiStream(fallbackProvider, apiKeyEntry.keyValue, fallbackModel, history, fallbackTextContent, sendSse, null);
                            if (!fallbackResult.errorOccurred) {
                                providerUsed = fallbackProvider; actualModelUsed = fallbackModel; finalAiContent = fallbackResult.fullResponseContent;
                                finalReasoningContent = fallbackResult.fullReasoningContent; fullCitations = fallbackResult.fullCitations; finalModelNameToSave = actualModelUsed;
                                break;
                            }
                        }
                    }
                }
                if (!providerUsed && !streamError) { streamError = true; sendSse({ type: 'error', message: 'Failed to get response from all providers.' }); }
                
                let savedAiMessageForStream = null;
                if (!streamError && finalAiContent !== null && finalModelNameToSave) {
                    const messageToSave = { session: sessionId, sender: 'ai', content: finalAiContent, modelUsed: finalModelNameToSave, ...(finalReasoningContent && { reasoningContent: finalReasoningContent }), ...(fullCitations.length > 0 && { citations: fullCitations }) };
                    savedAiMessageForStream = await ChatMessage.create(messageToSave);
                    if (savedAiMessageForStream) {
                        const parentSession = await ChatSession.findById(sessionId);
                        if (parentSession) {
                            parentSession.lastMessageTimestamp = savedAiMessageForStream.timestamp;
                            parentSession.lastAccessedAt = savedAiMessageForStream.timestamp;
                            await parentSession.save();
                            currentSessionForDoneEvent = parentSession; // Use this most up-to-date session for the 'done' event
                            console.log(`Streaming: Updated session ${sessionId} lastMessageTimestamp to AI message time: ${savedAiMessageForStream.timestamp}`);
                        }
                    }
                }

                if (finalModelNameToSave) sendSse({ type: 'model_info', modelUsed: finalModelNameToSave });
                sendSse({ type: 'done', updatedSession: currentSessionForDoneEvent.toObject() });

            } catch (error) { 
                streamError = true;
                if (!res.headersSent) { res.writeHead(500, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ success: false, error: 'Server Error before streaming' })); }
                else if (!res.writableEnded) { sendSse({ type: 'error', message: 'Internal Server Error during stream' }); }
            } finally {
                if (!res.writableEnded) res.end();
            }
            // Save AI message logic moved inside the try block to access savedMessage for timestamp update

        } else { // Non-Streaming Logic
            console.log("Processing request with streaming disabled.");
            let apiResult = null; let providerUsed = null; let actualModelUsed = null;
            let finalSessionDataForResponse = session.toObject(); // Initialize with current session state

            let providerToTry = null; let modelToTry = modelIdentifierForApi; let apiKeyToUse = null;
            if (modelToTry) {
                const targetProvider = findProviderForModel(modelToTry);
                if (targetProvider) {
                    const apiKeyEntry = await ApiKey.findOne({ providerName: targetProvider, isEnabled: true });
                    if (apiKeyEntry?.keyValue) { providerToTry = targetProvider; apiKeyToUse = apiKeyEntry.keyValue; }
                }
            }
            if (providerToTry && modelToTry && apiKeyToUse) {
                apiResult = await callApi(providerToTry, apiKeyToUse, modelToTry, history, finalUserMessageContentForApi, systemPromptForApi);
                if (apiResult && apiResult.content !== null) {
                    providerUsed = providerToTry; actualModelUsed = modelToTry;
                } else {
                    finalModelNameToSave = null; const defaultModelForProvider = DEFAULT_MODELS[providerToTry];
                    if (defaultModelForProvider && defaultModelForProvider !== modelToTry) {
                        apiResult = await callApi(providerToTry, apiKeyToUse, defaultModelForProvider, history, finalUserMessageContentForApi, systemPromptForApi);
                        if (apiResult && apiResult.content !== null) {
                            providerUsed = providerToTry; actualModelUsed = defaultModelForProvider; finalModelNameToSave = actualModelUsed;
                        }
                    }
                }
            }
            if (!providerUsed) {
                finalModelNameToSave = null;
                const enabledKeysSorted = await ApiKey.find({ isEnabled: true }).sort({ priority: 1 });
                if (!enabledKeysSorted || enabledKeysSorted.length === 0) apiResult = { content: 'Sorry, no API providers are available.', citations: null };
                else {
                    for (const apiKeyEntry of enabledKeysSorted) {
                        const fallbackProvider = apiKeyEntry.providerName; if (providerToTry === fallbackProvider) continue;
                        const fallbackModel = DEFAULT_MODELS[fallbackProvider]; if (!fallbackModel) continue;
                        const fallbackTextContent = typeof finalUserMessageContentForApi === 'string' ? finalUserMessageContentForApi : (finalUserMessageContentForApi.find(part => part.type === 'text')||{text:''}).text;
                        apiResult = await callApi(fallbackProvider, apiKeyEntry.keyValue, fallbackModel, history, fallbackTextContent);
                        if (apiResult && apiResult.content !== null) { providerUsed = fallbackProvider; actualModelUsed = fallbackModel; finalModelNameToSave = actualModelUsed; break; }
                    }
                }
            }
            if (!providerUsed || !apiResult || apiResult.content === null) {
                apiResult = { content: 'Sorry, I could not process that request.', citations: null };
            }
            
            const aiMessageData = { session: sessionId, sender: 'ai', content: apiResult.content, modelUsed: finalModelNameToSave, ...(apiResult.citations && apiResult.citations.length > 0 && { citations: apiResult.citations }) };
            const aiMessage = await ChatMessage.create(aiMessageData);

            if (aiMessage) {
                const parentSession = await ChatSession.findById(sessionId);
                if (parentSession) {
                    parentSession.lastMessageTimestamp = aiMessage.timestamp;
                    parentSession.lastAccessedAt = aiMessage.timestamp;
                    await parentSession.save();
                    finalSessionDataForResponse = parentSession.toObject();
                    console.log(`Non-Streaming: Updated session ${sessionId} lastMessageTimestamp to AI message time: ${aiMessage.timestamp}`);
                }
            }
            
            if (req.user && req.user.id && useSessionMemory && apiResult && apiResult.content) {
                const userMemoryDocForAuto = await UserMemory.findOne({ userId: req.user.id });
                if (userMemoryDocForAuto && userMemoryDocForAuto.isGloballyEnabled) {
                    const lastUserText = content || '';
                    if (lastUserText.length > 0 && lastUserText.length <= 75 && !lastUserText.includes('?') && !['what', 'how', 'why', 'who', 'when', 'where', 'tell me'].some(q => lastUserText.toLowerCase().startsWith(q))) {
                        const trimmedUserText = lastUserText.trim();
                        const existingContextIndex = userMemoryDocForAuto.contexts.findIndex(c => c.text === trimmedUserText);
                        const now = new Date();
                        if (existingContextIndex > -1) userMemoryDocForAuto.contexts[existingContextIndex].updatedAt = now;
                        else userMemoryDocForAuto.contexts.push({ text: trimmedUserText, source: 'chat_auto_extracted', createdAt: now, updatedAt: now });
                        try { await userMemoryDocForAuto.save(); } catch (saveError) { console.error(`Error saving user memory (non-stream) after auto-extraction: `, saveError); }
                    }
                }
            }
            res.status(201).json({ success: true, userMessage: savedUserMessage, data: aiMessage, updatedSession: finalSessionDataForResponse });
        } 
    } catch (error) { 
        console.error("Add Message Error (Outer Catch):", error);
        if (error.name === 'CastError') return res.status(404).json({ success: false, error: `Chat session not found with id ${req.params.sessionId}` });
        if (error.name === 'ValidationError') { const messages = Object.values(error.errors).map(val => val.message); return res.status(400).json({ success: false, error: messages }); }
        if (!res.headersSent) res.status(500).json({ success: false, error: 'Server Error adding message' });
        else console.error("Headers already sent, cannot send 500 error response.");
    }
};
