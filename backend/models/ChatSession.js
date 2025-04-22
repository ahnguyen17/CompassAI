const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid'); // For generating unique share IDs

const ChatSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    trim: true,
    // We can perhaps auto-generate this from the first message later
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastAccessedAt: { // Added field to track last access/interaction
    type: Date,
    default: Date.now,
  },
  isShared: {
    type: Boolean,
    default: false,
  },
  shareId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple documents to have null/undefined shareId, but shared ones must be unique
    // We'll generate this only when the user chooses to share
  },
  // We might want to store the last updated time as well
  // updatedAt: {
  //   type: Date,
  //   default: Date.now,
  // }
});

// Optional: Middleware to update `updatedAt` timestamp on save
// ChatSessionSchema.pre('save', function(next) {
//   this.updatedAt = Date.now();
//   next();
// });

// Optional: Method to generate a share ID if needed
// ChatSessionSchema.methods.generateShareId = function() {
//   if (!this.shareId) {
//     this.shareId = uuidv4();
//   }
// };

module.exports = mongoose.model('ChatSession', ChatSessionSchema);
