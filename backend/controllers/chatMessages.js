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
                // Decide if you want to stop or continue without the file
                // For now, let's return an error
                return res.status(500).json({ success: false, error: 'Failed to upload file to S3.' });
            }
        }

        const userMessageData = {
            session: sessionId,
            sender: 'user',
            content: content || '', // Save empty string if no text content
            fileInfo: uploadedFile ? {
                filename: s3ObjectKey, // Store S3 object key as filename
                originalname: uploadedFile.originalname,
                mimetype: uploadedFile.mimetype,
                size: uploadedFile.size,
                path: s3FileUrl // Store the full public S3 URL
            } : undefined
        };

        if (uploadedFile) {
            console.log('S3 Object Key:', s3ObjectKey);
            console.log('Stored file path (S3 URL):', userMessageData.fileInfo.path);
        }
        const savedUserMessage = await ChatMessage.create(userMessageData);
        console.log("Saved user message to DB:", savedUserMessage._id);

        // Update ChatSession's lastMessageTimestamp
        session.lastMessageTimestamp = savedUserMessage.timestamp;
        // Also update lastAccessedAt here to keep them in sync if a message is the latest interaction
        session.lastAccessedAt = savedUserMessage.timestamp; 
        await session.save();
        console.log(`Updated lastMessageTimestamp and lastAccessedAt for session ${sessionId} to ${savedUserMessage.timestamp}`);

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

        // --- Prepare User Memory Context ---
        let memoryContextForPrompt = "";
        if (req.user && req.user.id) { // Ensure user is available
            const userMemory = await UserMemory.findOne({ userId: req.user.id });
            // Check global enable and session-specific toggle
            if (userMemory && userMemory.isGloballyEnabled && useSessionMemory) { 
                if (userMemory.contexts && userMemory.contexts.length > 0) {
                    // Sort by updatedAt or createdAt descending to get the most recent
                    const sortedContexts = [...userMemory.contexts].sort((a, b) => 
                        (b.updatedAt || b.createdAt).getTime() - (a.updatedAt || a.createdAt).getTime()
                    );
                    
                    // Take up to a certain number of contexts (e.g., 10, could be from userMemory.maxContexts or a fixed number for prompt injection)
                    const contextsToUse = sortedContexts.slice(0, Math.min(10, userMemory.maxContexts)); 
                    
                    if (contextsToUse.length > 0) {
                        memoryContextForPrompt = "Relevant information about you based on past interactions:\n" +
                                                contextsToUse.map(c => `- ${c.text}`).join("\n") +
                                                "\n\n---\n\n"; // Separator
                        console.log(`Injecting ${contextsToUse.length} memory contexts for user ${req.user.id}`);
                    }
                }
            }
        }
        // --- End Prepare User Memory Context ---

        // Inject memory context into systemPromptForApi
        if (memoryContextForPrompt) {
            if (systemPromptForApi) {
                systemPromptForApi = memoryContextForPrompt + systemPromptForApi;
            } else {
                systemPromptForApi = memoryContextForPrompt;
            }
        }

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
                // Use the buffer directly from multer.memoryStorage()
                const imageBuffer = uploadedFile.buffer; 
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
                 // Use uploadedFile.buffer directly for text extraction
                 const dataBuffer = uploadedFile.buffer;

                 if (uploadedFile.mimetype === 'application/pdf') {
                     try {
                         console.log(`Attempting to parse PDF from buffer...`);
                         const pdfData = await pdf(dataBuffer); // pdf-parse can take a buffer
                         console.log(`Parsed PDF successfully from buffer.`);
                         const maxChars = 5000; // Limit extracted text length
                         const extractedText = pdfData.text.substring(0, maxChars);
                         fileTextContent = `\n\n--- Start of PDF Content (${uploadedFile.originalname}) ---\n${extractedText}${pdfData.text.length > maxChars ? '\n[...content truncated]' : ''}\n--- End of PDF Content ---`;
                     } catch (pdfError) {
                         console.error("Error processing PDF:", pdfError);
                         fileTextContent = `\n\n[File Uploaded: ${uploadedFile.originalname} - Error processing PDF content]`;
                     }
                 }
                 // DOCX processing
                 else if (uploadedFile.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                    try {
                        // mammoth.extractRawText can take a buffer
                        const result = await mammoth.extractRawText({ buffer: dataBuffer });
                        const maxChars = 10000; 
                        const extractedText = result.value.substring(0, maxChars);
                        fileTextContent = `\n\n--- Start of DOCX Content (${uploadedFile.originalname}) ---\n${extractedText}${result.value.length > maxChars ? '\n[...content truncated]' : ''}\n--- End of DOCX Content ---`;
                    } catch (docxError) {
                        console.error("Error processing DOCX from buffer:", docxError);
                        fileTextContent = `\n\n[File Uploaded: ${uploadedFile.originalname} - Error processing DOCX content]`;
                    }
                 }
                 // DOC processing - WordExtractor might need a filepath. If it doesn't support buffers, this part is tricky.
                 // For now, let's assume it might not work directly with a buffer or requires temp file.
                 // This part might need a temporary file write if WordExtractor strictly needs a path.
                 // However, the goal is to avoid local saving.
                 // Let's comment out direct DOC processing from buffer if WordExtractor doesn't support it.
                 // else if (uploadedFile.mimetype === 'application/msword') {
                 //    try {
                 //        // const doc = await wordExtractor.extract(dataBuffer); // Check if this works
                 //        // For now, we'll skip direct DOC buffer processing if it's problematic
                 //        fileTextContent = `\n\n[File Uploaded: ${uploadedFile.originalname} (DOC - content extraction from buffer needs review)]`;
                 //        console.warn("DOC processing from buffer needs verification for WordExtractor library.");
                 //    } catch (docError) {
                 //        console.error("Error processing DOC from buffer:", docError);
                 //        fileTextContent = `\n\n[File Uploaded: ${uploadedFile.originalname} - Error processing DOC content]`;
                 //    }
                 // }
                 // XLSX and XLS processing
                 else if (uploadedFile.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || uploadedFile.mimetype === 'application/vnd.ms-excel') {
                    try {
                        // XLSX.read can take a buffer
                        const workbook = XLSX.read(dataBuffer, { type: 'buffer' });
                        let fullExtractedText = "";
                        let totalChars = 0;
                        const overallMaxChars = 15000; // Overall limit for Excel content

                        for (const sheetName of workbook.SheetNames) {
                            if (totalChars >= overallMaxChars) break;
                            if (workbook.SheetNames.length > 1) {
                                const sheetHeader = `\n--- Content from Sheet: ${sheetName} ---\n`;
                                if (totalChars + sheetHeader.length > overallMaxChars) break; // Check before adding header
                                fullExtractedText += sheetHeader;
                                totalChars += sheetHeader.length;
                            }
                            
                            const sheet = workbook.Sheets[sheetName];
                            const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
                            
                            for (const row of sheetData) {
                                if (totalChars >= overallMaxChars) break;
                                let rowText = "";
                                for (const cell of row) {
                                    if (totalChars >= overallMaxChars) break;
                                    let cellText = "";
                                    if (cell && typeof cell === 'string' && cell.trim() !== "") {
                                        cellText = cell.trim() + " ";
                                    } else if (cell && typeof cell === 'number') {
                                        cellText = cell.toString() + " ";
                                    }

                                    if (totalChars + cellText.length > overallMaxChars) {
                                        cellText = cellText.substring(0, overallMaxChars - totalChars);
                                        rowText += cellText;
                                        totalChars = overallMaxChars;
                                        break; 
                                    }
                                    rowText += cellText;
                                    totalChars += cellText.length;
                                }
                                fullExtractedText += rowText.trimRight() + "\n"; // Add row text (trimmed) and a newline
                                if (totalChars >= overallMaxChars) break;
                            }
                            // No need for per-sheet truncation message if overall truncation is handled
                        }
                        if (totalChars >= overallMaxChars) {
                            fullExtractedText += "\n[...Excel content truncated due to overall size limit]";
                        }
                        fileTextContent = `\n\n--- Start of Excel Content (${uploadedFile.originalname}) ---\n${fullExtractedText.trim()}\n--- End of Excel Content ---`;
                    } catch (excelError) {
                        console.error("Error processing Excel file:", excelError);
                        fileTextContent = `\n\n[File Uploaded: ${uploadedFile.originalname} - Error processing Excel content]`;
                    }
                 }
                 // Note: PowerPoint (.ppt, .pptx) extraction is deferred due to library vulnerabilities.
                 // They will be treated as generic files if uploaded.

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
            // Also send the updated session data if it changed (e.g. title, lastMessageTimestamp)
            sendSse({ type: 'user_message_saved', message: savedUserMessage });
            console.log("Sent user_message_saved SSE event.");
            // --- End Send Saved User Message ---
            
            // If title was updated, send it via SSE as well
            // The full updated session (including lastMessageTimestamp) will be part of the 'done' event or final non-streaming response
            if (titleUpdated) {
                sendSse({ type: 'title_update', title: generatedTitle, sessionId: sessionId, lastAccessedAt: session.lastAccessedAt, lastMessageTimestamp: session.lastMessageTimestamp });
            }

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
                // Title update is now sent earlier if it happens
                // Send the full updated session with the 'done' event
                sendSse({ type: 'done', updatedSession: session.toObject() }); // Send updated session

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

                    // --- Automatic Context Extraction (Streaming) ---
                    if (req.user && req.user.id && useSessionMemory && finalAiContent) {
                        const userMemoryDocForAuto = await UserMemory.findOne({ userId: req.user.id });
                        if (userMemoryDocForAuto && userMemoryDocForAuto.isGloballyEnabled) {
                            const lastUserText = content || '';
                            if (lastUserText.length > 0 && lastUserText.length <= 75 &&
                                !lastUserText.includes('?') &&
                                !['what', 'how', 'why', 'who', 'when', 'where', 'tell me'].some(q => lastUserText.toLowerCase().startsWith(q))) {
                                const trimmedUserText = lastUserText.trim();
                                const existingContextIndex = userMemoryDocForAuto.contexts.findIndex(c => c.text === trimmedUserText);
                                const now = new Date();
                                if (existingContextIndex > -1) {
                                    userMemoryDocForAuto.contexts[existingContextIndex].updatedAt = now;
                                    console.log(`Auto-context (stream): Updated timestamp for existing context: "${trimmedUserText}"`);
                                } else {
                                    userMemoryDocForAuto.contexts.push({ text: trimmedUserText, source: 'chat_auto_extracted', createdAt: now, updatedAt: now });
                                    console.log(`Auto-context (stream): Adding new context: "${trimmedUserText}"`);
                                }
                                try {
                                    await userMemoryDocForAuto.save();
                                    console.log(`User memory (stream) updated with auto-extracted context for user ${req.user.id}.`);
                                } catch (saveError) {
                                    console.error(`Error saving user memory (stream) after auto-extraction: `, saveError);
                                }
                            }
                        }
                    }
                    // --- End Automatic Context Extraction (Streaming) ---

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

            // --- Automatic Context Extraction (Non-Streaming) ---
            if (req.user && req.user.id && useSessionMemory && apiResult && apiResult.content) {
                const userMemoryDocForAuto = await UserMemory.findOne({ userId: req.user.id });
                if (userMemoryDocForAuto && userMemoryDocForAuto.isGloballyEnabled) {
                    const lastUserText = content || '';
                    if (lastUserText.length > 0 && lastUserText.length <= 75 &&
                        !lastUserText.includes('?') &&
                        !['what', 'how', 'why', 'who', 'when', 'where', 'tell me'].some(q => lastUserText.toLowerCase().startsWith(q))) {
                        const trimmedUserText = lastUserText.trim();
                        const existingContextIndex = userMemoryDocForAuto.contexts.findIndex(c => c.text === trimmedUserText);
                        const now = new Date();
                        if (existingContextIndex > -1) {
                            userMemoryDocForAuto.contexts[existingContextIndex].updatedAt = now;
                             console.log(`Auto-context (non-stream): Updated timestamp for existing context: "${trimmedUserText}"`);
                        } else {
                            userMemoryDocForAuto.contexts.push({ text: trimmedUserText, source: 'chat_auto_extracted', createdAt: now, updatedAt: now });
                            console.log(`Auto-context (non-stream): Adding new context: "${trimmedUserText}"`);
                        }
                        try {
                            await userMemoryDocForAuto.save();
                            console.log(`User memory (non-stream) updated with auto-extracted context for user ${req.user.id}.`);
                        } catch (saveError) {
                            console.error(`Error saving user memory (non-stream) after auto-extraction: `, saveError);
                        }
                    }
                }
            }
            // --- End Automatic Context Extraction (Non-Streaming) ---

            // 6. Send back the single AI response AND the saved user message, AND the updated session
            res.status(201).json({
              success: true,
              userMessage: savedUserMessage,
              data: aiMessage, 
              updatedSession: session.toObject() // Send the full updated session
              // updatedSessionTitle is no longer needed separately if full session is sent
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
