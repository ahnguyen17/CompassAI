require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const fs = require('fs'); // Import fs module
const path = require('path'); // Import path module
const connectDB = require('./config/db'); // Import database connection function

// Route files
// Route files
const authRoutes = require('./routes/auth');
const apiKeyRoutes = require('./routes/apiKeys');
const userRoutes = require('./routes/users');
const chatSessionRoutes = require('./routes/chatSessions');
const providerRoutes = require('./routes/providers');
const referralCodeRoutes = require('./routes/referralCodes'); // Import referral code routes
const disabledModelRoutes = require('./routes/disabledModels'); // Import disabled models routes
const statsRoutes = require('./routes/stats'); // Import stats routes

// Connect to Database
connectDB();

// Initialize Express app
const app = express();

// Middleware
// Configure CORS to allow specific origins in production
const allowedOrigins = [
    'https://frolicking-elf-a41c93.netlify.app', // Previous Netlify URL
    'https://asianblvd.com',                     // New custom domain
    'https://compassai-dev.onrender.com',        // New Render dev site
    'https://compass247.vn'                      // New VN domain
];

/* --- TEMPORARY DEBUGGING --- Allow all origins
const corsOptions = {
    origin: '*', // Allow all origins for debugging
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};
console.warn("!!! CORS is temporarily allowing all origins for debugging !!!"); // Add warning log
--- END TEMPORARY DEBUGGING --- */

// Original CORS Options:
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests) or from allowed origins
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Allow cookies if needed for auth later
    optionsSuccessStatus: 204 // For legacy browser support
};
// */ // End comment block for original options
app.use(cors(corsOptions)); // Use the original options again
app.use(express.json()); // Parse JSON request bodies

// Basic route
app.get('/', (req, res) => {
  res.send('AI Chatbox Backend is running!');
});

// Mount routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/apikeys', apiKeyRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/chatsessions', chatSessionRoutes);
app.use('/api/v1/providers', providerRoutes);
app.use('/api/v1/referralcodes', referralCodeRoutes); // Mount referral code routes
app.use('/api/v1/disabledmodels', disabledModelRoutes); // Mount disabled models routes
app.use('/api/v1/stats', statsRoutes); // Mount stats routes

// Define the port
const PORT = process.env.PORT || 5000; // Use port from .env or default to 5000

// Start the server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
