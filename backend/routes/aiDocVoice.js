const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
    transcribeAudio,
    generateSpeech,
    getAvailableVoices,
    getVoiceStatus
} = require('../controllers/aiDocVoice');

const { protect } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/voice-temp');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for audio file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.webm';
        cb(null, 'audio-' + uniqueSuffix + ext);
    }
});

// File filter to accept only audio files
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'audio/webm',
        'audio/wav',
        'audio/mp3',
        'audio/mpeg',
        'audio/mp4',
        'audio/m4a',
        'audio/ogg',
        'audio/flac'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only audio files are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB limit (Whisper API limit)
    }
});

// Routes
router.post('/transcribe', protect, upload.single('audio'), transcribeAudio);
router.post('/speak', protect, generateSpeech);
router.get('/voices', protect, getAvailableVoices);
router.get('/status', protect, getVoiceStatus);

module.exports = router;

