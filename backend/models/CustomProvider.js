const mongoose = require('mongoose');

const CustomProviderSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Please add a provider name'], 
        unique: true, 
        trim: true 
    }
}, {
    timestamps: true // Optional: Adds createdAt and updatedAt timestamps
});

// Add pre-remove hook to delete associated CustomModels when a provider is removed
CustomProviderSchema.pre('remove', async function(next) {
    console.log(`Removing custom models for provider ${this._id}...`); // Optional logging
    try {
        await this.model('CustomModel').deleteMany({ provider: this._id });
        next();
    } catch (error) {
        console.error(`Error deleting custom models for provider ${this._id}:`, error);
        next(error); // Pass error to the next middleware or handler
    }
});

module.exports = mongoose.model('CustomProvider', CustomProviderSchema);
