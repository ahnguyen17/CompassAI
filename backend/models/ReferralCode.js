const mongoose = require('mongoose');

const ReferralCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please provide a code value'],
    unique: true,
    trim: true,
    // Add length validation if desired
    // minlength: 6,
    // maxlength: 20,
  },
  description: { // Optional description for admin reference
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Optional: Add expiration date or usage limits if needed later
  // expiresAt: Date,
  // maxUses: Number,
  // timesUsed: { type: Number, default: 0 }
});

// Optional: Add pre-save hook to uppercase the code, etc.
// ReferralCodeSchema.pre('save', function(next) {
//   this.code = this.code.toUpperCase();
//   next();
// });

module.exports = mongoose.model('ReferralCode', ReferralCodeSchema);
