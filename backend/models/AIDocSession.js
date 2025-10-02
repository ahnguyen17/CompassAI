const mongoose = require('mongoose');

const AIDocSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    trim: true,
    default: 'New Medical Consultation',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now,
  },
  lastMessageTimestamp: {
    type: Date,
  },
  // Store the system prompt used for this session
  systemPrompt: {
    type: String,
    default: '',
  },
  // Store the model used for this session
  modelUsed: {
    type: String,
    default: '',
  },
});

module.exports = mongoose.model('AIDocSession', AIDocSessionSchema);

