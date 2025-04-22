const mongoose = require('mongoose');

const CustomModelSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Please add a custom model name'], 
        trim: true 
    },
    provider: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'CustomProvider', 
        required: [true, 'Please link to a Custom Provider'] 
    },
    baseModelIdentifier: { 
        type: String, 
        required: [true, 'Please link to a base API model identifier (e.g., gpt-4o)'],
        trim: true
    },
    systemPrompt: { 
        type: String, 
        default: '' 
    }
}, {
    timestamps: true // Optional: Adds createdAt and updatedAt timestamps
});

// Optional: Add an index for faster lookups if needed, e.g., by provider
// CustomModelSchema.index({ provider: 1 }); 

module.exports = mongoose.model('CustomModel', CustomModelSchema);
