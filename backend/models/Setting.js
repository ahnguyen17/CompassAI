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
  allowedCustomAIModels: {
    type: [String], // Array of model identifiers that can be used for custom AIs
    default: [], // Empty array means all models are allowed
  },
  maxKnowledgeSourcesPerAI: {
    type: Number, // Maximum number of knowledge base files per custom AI
    default: 20, // Default limit of 20 files per custom AI
    min: 0, // Minimum 0 (no files allowed)
    max: 100, // Maximum 100 files per custom AI
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
    settings = await this.create({ key: 'globalSettings' });
  } else {
    // Migration: Ensure new fields exist in existing documents
    let needsUpdate = false;
    if (settings.allowedCustomAIModels === undefined) {
      settings.allowedCustomAIModels = [];
      needsUpdate = true;
    }
    if (settings.maxKnowledgeSourcesPerAI === undefined) {
      settings.maxKnowledgeSourcesPerAI = 20;
      needsUpdate = true;
    }
    if (needsUpdate) {
      await settings.save();
    }
  }
  return settings;
};


module.exports = mongoose.model('Setting', SettingSchema);
