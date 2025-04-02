const mongoose = require('mongoose');

const DisabledModelSchema = new mongoose.Schema({
  modelName: {
    type: String,
    required: [true, 'Please add a model name'],
    unique: true,
    trim: true,
  },
  // Optional: Could add who disabled it and when
  // disabledBy: {
  //   type: mongoose.Schema.ObjectId,
  //   ref: 'User'
  // },
  // disabledAt: {
  //   type: Date,
  //   default: Date.now
  // }
}, {
  timestamps: { createdAt: 'disabledAt' } // Use createdAt timestamp as disabledAt
});

module.exports = mongoose.model('DisabledModel', DisabledModelSchema);
