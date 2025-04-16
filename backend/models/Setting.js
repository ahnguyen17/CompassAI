const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
  // Using a unique key to ensure only one settings document exists
  key: {
    type: String,
    default: 'globalSettings',
    unique: true,
    required: true,
  },
  globalStreamingEnabled: {
    type: Boolean,
    default: true, // Default global setting for streaming
  },
  // Add other global settings here as needed in the future
  lastUpdatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update lastUpdatedAt timestamp before saving
SettingSchema.pre('save', function (next) {
  this.lastUpdatedAt = Date.now();
  next();
});

// Ensure there's a default settings document if none exists
SettingSchema.statics.getSettings = async function () {
  let settings = await this.findOne({ key: 'globalSettings' });
  if (!settings) {
    // If no settings document exists, create one with defaults
    console.log('No global settings found, creating default settings document.');
    settings = await this.create({ key: 'globalSettings' });
  }
  return settings;
};


module.exports = mongoose.model('Setting', SettingSchema);
