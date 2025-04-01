require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db'); // Import database connection function

// Route files
// Route files
const authRoutes = require('./routes/auth');
const apiKeyRoutes = require('./routes/apiKeys');
const userRoutes = require('./routes/users');
const chatSessionRoutes = require('./routes/chatSessions');
const providerRoutes = require('./routes/providers');
const referralCodeRoutes = require('./routes/referralCodes'); // Import referral code routes

// Connect to Database
connectDB();

// Initialize Express app
const app = express();

// Middleware
// Configure CORS to allow specific origin in production
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? 'https://frolicking-elf-a41c93.netlify.app' // Your deployed frontend URL
        : '*', // Allow all origins in development (or specify localhost)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Allow cookies if needed for auth later
    optionsSuccessStatus: 204 // For legacy browser support
};
app.use(cors(corsOptions));
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

// Define the port
const PORT = process.env.PORT || 5000; // Use port from .env or default to 5000

// Start the server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
