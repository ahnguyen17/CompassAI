const { OpenAI } = require('openai');
const { createClient } = require('@deepgram/sdk');
const ApiKey = require('../models/ApiKey');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

/**
 * @desc    Transcribe audio using Deepgram Nova 2 API
 * @route   POST /api/v1/aidoc/voice/transcribe
 * @access  Private
 */
exports.transcribeAudio = async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No audio file provided'
            });
        }

        // Get language from request (optional, defaults to Vietnamese)
        const language = req.body.language || 'vi';

        // Get Deepgram API key from environment or database
        let deepgramApiKey = process.env.DEEPGRAM_API_KEY;

        if (!deepgramApiKey) {
            // Try to get from database (using providerName field)
            const apiKeyDoc = await ApiKey.findOne({
                providerName: 'DEEPGRAM_API_KEY',
                isEnabled: true
            });
            if (apiKeyDoc) {
                deepgramApiKey = apiKeyDoc.keyValue;
            }
        }

        if (!deepgramApiKey) {
            return res.status(500).json({
                success: false,
                error: 'Deepgram API key not configured. Please add it in Settings > Voice Mode.'
            });
        }

        // Initialize Deepgram client
        const deepgram = createClient(deepgramApiKey);

        // Read audio file
        const audioBuffer = fs.readFileSync(req.file.path);

        // Transcribe audio using Deepgram Nova 2
        const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
            audioBuffer,
            {
                model: 'nova-2-medical',    // Use medical-optimized model for AIDoc
                language: language,          // Vietnamese or other language
                punctuate: true,             // Add punctuation
                smart_format: true,          // Smart formatting (dates, numbers, etc.)
                diarize: false,              // No speaker diarization needed
                utterances: false,           // Don't split into utterances
                detect_language: false,      // We know the language
            }
        );

        // Clean up uploaded file
        await unlinkAsync(req.file.path).catch(err =>
            console.error('Error deleting temp file:', err)
        );

        // Check for errors
        if (error) {
            console.error('Deepgram transcription error:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Transcription failed'
            });
        }

        // Extract transcript from result
        const transcript = result?.results?.channels[0]?.alternatives[0]?.transcript;

        if (!transcript) {
            return res.status(500).json({
                success: false,
                error: 'No transcription returned'
            });
        }

        // Log success
        console.log('[Deepgram] Transcription successful:', transcript.substring(0, 50) + '...');

        // Return transcription
        res.status(200).json({
            success: true,
            transcript: transcript,
            language: language,
            confidence: result?.results?.channels[0]?.alternatives[0]?.confidence || null
        });

    } catch (error) {
        console.error('Deepgram transcription error:', error);

        // Clean up uploaded file on error
        if (req.file && req.file.path) {
            await unlinkAsync(req.file.path).catch(err =>
                console.error('Error deleting temp file:', err)
            );
        }

        res.status(500).json({
            success: false,
            error: error.message || 'Failed to transcribe audio'
        });
    }
};

/**
 * @desc    Generate speech using OpenAI TTS API
 * @route   POST /api/v1/aidoc/voice/speak
 * @access  Private
 */
exports.generateSpeech = async (req, res) => {
    try {
        const { text, voice = 'alloy', speed = 1.0 } = req.body;

        // Validate input
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Text is required'
            });
        }

        // Validate voice
        const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
        if (!validVoices.includes(voice)) {
            return res.status(400).json({
                success: false,
                error: `Invalid voice. Must be one of: ${validVoices.join(', ')}`
            });
        }

        // Validate speed
        if (speed < 0.25 || speed > 4.0) {
            return res.status(400).json({
                success: false,
                error: 'Speed must be between 0.25 and 4.0'
            });
        }

        // Get OpenAI API key
        const apiKeyDoc = await ApiKey.findOne({ providerName: 'OpenAI', isEnabled: true });
        if (!apiKeyDoc) {
            return res.status(503).json({
                success: false,
                error: 'OpenAI API key not found or disabled'
            });
        }

        // Initialize OpenAI client
        const openai = new OpenAI({ apiKey: apiKeyDoc.keyValue });

        // Generate speech
        const mp3Response = await openai.audio.speech.create({
            model: 'tts-1',
            voice: voice,
            input: text,
            speed: speed,
            response_format: 'mp3'
        });

        // Get the audio buffer
        const buffer = Buffer.from(await mp3Response.arrayBuffer());

        // Set headers for audio streaming
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'no-cache');

        // Send the audio
        res.send(buffer);

    } catch (error) {
        console.error('TTS generation error:', error);

        // Handle specific OpenAI errors
        if (error.response) {
            return res.status(error.response.status || 500).json({
                success: false,
                error: error.response.data?.error?.message || 'TTS API error'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to generate speech'
        });
    }
};

/**
 * @desc    Get available OpenAI TTS voices
 * @route   GET /api/v1/aidoc/voice/voices
 * @access  Private
 */
exports.getAvailableVoices = async (req, res) => {
    try {
        // Return list of available OpenAI TTS voices with descriptions
        const voices = [
            {
                id: 'alloy',
                name: 'Alloy',
                description: 'Neutral and balanced voice',
                gender: 'neutral'
            },
            {
                id: 'echo',
                name: 'Echo',
                description: 'Male voice with clear articulation',
                gender: 'male'
            },
            {
                id: 'fable',
                name: 'Fable',
                description: 'British accent, expressive',
                gender: 'male'
            },
            {
                id: 'onyx',
                name: 'Onyx',
                description: 'Deep male voice',
                gender: 'male'
            },
            {
                id: 'nova',
                name: 'Nova',
                description: 'Female voice, warm and friendly',
                gender: 'female'
            },
            {
                id: 'shimmer',
                name: 'Shimmer',
                description: 'Female voice, soft and gentle',
                gender: 'female'
            }
        ];

        res.status(200).json({
            success: true,
            voices: voices
        });

    } catch (error) {
        console.error('Get voices error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get available voices'
        });
    }
};

/**
 * @desc    Check if OpenAI voice features are available
 * @route   GET /api/v1/aidoc/voice/status
 * @access  Private
 */
exports.getVoiceStatus = async (req, res) => {
    try {
        // Check if OpenAI API key is available
        const apiKeyDoc = await ApiKey.findOne({ providerName: 'OpenAI', isEnabled: true });
        
        res.status(200).json({
            success: true,
            available: !!apiKeyDoc,
            features: {
                whisper: !!apiKeyDoc,
                tts: !!apiKeyDoc
            }
        });

    } catch (error) {
        console.error('Voice status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check voice status'
        });
    }
};

