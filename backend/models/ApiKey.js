const mongoose = require('mongoose');

const ApiKeySchema = new mongoose.Schema({
  providerName: {
    type: String,
    required: [true, 'Please specify the API provider name (e.g., OpenAI, DeepSeek)'],
    unique: true, // Usually, you'd have one key per provider
    trim: true,
  },
  keyValue: {
    type: String,
    required: [true, 'Please provide the API key value'],
    // Note: Storing API keys directly in the database is risky.
    // Consider encryption or using a secure secret management service in production.
    // For now, we store it as a string.
  },
  isEnabled: {
    type: Boolean,
    default: true, // Allows easily disabling a key without deleting it
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now,
  },
  priority: { // Lower number = higher priority
    type: Number,
    default: 99, // Default to low priority
  }
});

// Middleware to update `lastUpdatedAt` timestamp on save/update
ApiKeySchema.pre('save', function(next) {
  this.lastUpdatedAt = Date.now();
  next();
});

// Consider adding pre-update hooks as well if using methods like findByIdAndUpdate

module.exports = mongoose.model('ApiKey', ApiKeySchema);
