const mongoose = require('mongoose');

const AIDocMessageSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.ObjectId,
    ref: 'AIDocSession',
    required: true,
    index: true,
  },
  sender: {
    type: String,
    required: true,
    enum: ['user', 'ai'],
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  modelUsed: {
    type: String,
    required: false,
  },
  reasoningContent: {
    type: String,
    required: false,
  },
});

module.exports = mongoose.model('AIDocMessage', AIDocMessageSchema);

