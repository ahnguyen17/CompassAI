const mongoose = require('mongoose');

// Subdocument schema for knowledge base files
const KnowledgeBaseFileSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: [true, 'Original file name is required.'],
      trim: true,
    },
    fileName: {
      type: String,
      required: [true, 'Stored file name is required.'],
      trim: true,
    },
    filePath: {
      type: String,
      required: [true, 'File path is required.'],
      trim: true,
    },
    fileType: {
      type: String,
      required: [true, 'File type is required.'],
      enum: ['pdf', 'doc', 'docx', 'txt', 'md', 'xls', 'xlsx', 'png', 'jpg', 'jpeg'],
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required.'],
      min: [1, 'File size must be greater than 0.'],
    },
    extractedText: {
      type: String,
      default: '', // Will be populated after file processing
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    processingError: {
      type: String,
      default: '',
    },
    // Mongoose adds _id automatically to subdocuments
  },
  { timestamps: true } // Adds createdAt and updatedAt to each file
);

const CustomAISchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required.'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'AI name is required.'],
      trim: true,
      maxlength: [50, 'AI name cannot exceed 50 characters.'],
    },
    model: {
      type: String,
      required: [true, 'AI model is required.'],
      trim: true,
    },
    instructions: {
      type: String,
      required: [true, 'AI instructions are required.'],
      trim: true,
      maxlength: [2000, 'AI instructions cannot exceed 2000 characters.'],
    },
    knowledgeBaseFiles: [KnowledgeBaseFileSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt to the CustomAI document
  }
);

// Index for faster lookups by user
CustomAISchema.index({ userId: 1, createdAt: -1 });

// Index for faster lookups by user and name (for uniqueness within user)
CustomAISchema.index({ userId: 1, name: 1 }, { unique: true });

// Pre-save hook to validate knowledge base files limit
CustomAISchema.pre('save', async function (next) {
  if (this.knowledgeBaseFiles && this.knowledgeBaseFiles.length > 0) {
    try {
      const Setting = require('./Setting');
      const settings = await Setting.getSettings();
      const maxFiles = settings.maxKnowledgeSourcesPerAI || 20; // Fallback to 20 if not set

      if (this.knowledgeBaseFiles.length > maxFiles) {
        const error = new Error(`Cannot have more than ${maxFiles} knowledge base files.`);
        error.name = 'ValidationError';
        return next(error);
      }
    } catch (err) {
      // If we can't get settings, use default limit of 20
      if (this.knowledgeBaseFiles.length > 20) {
        const error = new Error('Cannot have more than 20 knowledge base files.');
        error.name = 'ValidationError';
        return next(error);
      }
    }
  }
  next();
});

// Instance method to get total knowledge base size
CustomAISchema.methods.getTotalKnowledgeBaseSize = function () {
  return this.knowledgeBaseFiles.reduce((total, file) => total + file.fileSize, 0);
};

// Instance method to get processed knowledge base text
CustomAISchema.methods.getKnowledgeBaseText = function () {
  return this.knowledgeBaseFiles
    .filter(file => file.processingStatus === 'completed' && file.extractedText)
    .map(file => `[From ${file.originalName}]\n${file.extractedText}`)
    .join('\n\n---\n\n');
};

// Static method to find user's custom AIs
CustomAISchema.statics.findByUserId = function (userId) {
  return this.find({ userId, isActive: true }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('CustomAI', CustomAISchema);
