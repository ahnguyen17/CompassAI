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

// Subdocument schema for knowledge base URLs
const KnowledgeBaseUrlSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: [true, 'Original URL is required.'],
      trim: true,
      maxlength: [2048, 'URL cannot exceed 2048 characters.'],
    },
    title: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Title cannot exceed 500 characters.'],
    },
    contentType: {
      type: String,
      default: 'text/html',
      trim: true,
    },
    extractedText: {
      type: String,
      default: '', // Will be populated after URL processing
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
    fetchTimestamp: {
      type: Date,
      default: Date.now,
    },
    contentLength: {
      type: Number,
      default: 0,
      min: [0, 'Content length cannot be negative.'],
    },
    // Mongoose adds _id automatically to subdocuments
  },
  { timestamps: true } // Adds createdAt and updatedAt to each URL
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
      maxlength: [5000, 'AI instructions cannot exceed 5000 characters.'],
    },
    knowledgeBaseFiles: [KnowledgeBaseFileSchema],
    knowledgeBaseUrls: [KnowledgeBaseUrlSchema],
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

// Pre-save hook to validate knowledge base sources limit (files + URLs)
CustomAISchema.pre('save', async function (next) {
  const totalFiles = (this.knowledgeBaseFiles || []).length;
  const totalUrls = (this.knowledgeBaseUrls || []).length;
  const totalSources = totalFiles + totalUrls;

  if (totalSources > 0) {
    try {
      const Setting = require('./Setting');
      const settings = await Setting.getSettings();
      const maxSources = settings.maxKnowledgeSourcesPerAI || 20; // Fallback to 20 if not set

      if (totalSources > maxSources) {
        const error = new Error(`Cannot have more than ${maxSources} knowledge base sources (files + URLs combined).`);
        error.name = 'ValidationError';
        return next(error);
      }
    } catch (err) {
      // If we can't get settings, use default limit of 20
      if (totalSources > 20) {
        const error = new Error('Cannot have more than 20 knowledge base sources (files + URLs combined).');
        error.name = 'ValidationError';
        return next(error);
      }
    }
  }
  next();
});

// Instance method to get total knowledge base size (files only)
CustomAISchema.methods.getTotalKnowledgeBaseSize = function () {
  return this.knowledgeBaseFiles.reduce((total, file) => total + file.fileSize, 0);
};

// Instance method to get total knowledge sources count (files + URLs)
CustomAISchema.methods.getTotalKnowledgeSourcesCount = function () {
  const fileCount = (this.knowledgeBaseFiles || []).length;
  const urlCount = (this.knowledgeBaseUrls || []).length;
  return fileCount + urlCount;
};

// Instance method to get processed knowledge base text (files + URLs)
CustomAISchema.methods.getKnowledgeBaseText = function () {
  const fileTexts = this.knowledgeBaseFiles
    .filter(file => file.processingStatus === 'completed' && file.extractedText)
    .map(file => `[From File: ${file.originalName}]\n${file.extractedText}`);

  const urlTexts = (this.knowledgeBaseUrls || [])
    .filter(url => url.processingStatus === 'completed' && url.extractedText)
    .map(url => `[From URL: ${url.title || url.originalUrl}]\n${url.extractedText}`);

  return [...fileTexts, ...urlTexts].join('\n\n---\n\n');
};

// Static method to find user's custom AIs
CustomAISchema.statics.findByUserId = function (userId) {
  return this.find({ userId, isActive: true }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('CustomAI', CustomAISchema);
