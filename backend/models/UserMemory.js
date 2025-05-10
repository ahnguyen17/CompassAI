const mongoose = require('mongoose');

// Subdocument schema for individual context items
const ContextItemSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Context text is required.'],
      trim: true,
    },
    source: {
      type: String,
      enum: ['manual', 'chat_auto_extracted'],
      required: [true, 'Context source is required.'],
    },
    // Mongoose adds _id automatically to subdocuments
  },
  { timestamps: true } // Adds createdAt and updatedAt to each context item
);

const UserMemorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      unique: true,
    },
    isGloballyEnabled: {
      type: Boolean,
      default: true,
    },
    maxContexts: {
      type: Number,
      default: 50,
      min: [1, 'Maximum contexts must be at least 1.'],
      max: [200, 'Maximum contexts cannot exceed 200.'],
    },
    contexts: [ContextItemSchema],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt to the UserMemory document
  }
);

// Pre-save hook to manage the contexts array
UserMemorySchema.pre('save', function (next) {
  // Only run if contexts array is modified to avoid unnecessary processing
  if (this.isModified('contexts')) {
    // Sort contexts by their 'updatedAt' field in descending order (most recent first)
    this.contexts.sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt; // Fallback to createdAt if updatedAt is not set (e.g. new item)
      const dateB = b.updatedAt || b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });

    // If the number of contexts exceeds maxContexts, trim the oldest ones
    if (this.contexts.length > this.maxContexts) {
      this.contexts = this.contexts.slice(0, this.maxContexts);
    }
  }
  next();
});

module.exports = mongoose.model('UserMemory', UserMemorySchema);
