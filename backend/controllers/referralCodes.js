const ReferralCode = require('../models/ReferralCode');

const MAX_CODES = 5; // Define the limit

// @desc    Get all active referral codes
// @route   GET /api/v1/referralcodes
// @access  Private/Admin
exports.getReferralCodes = async (req, res, next) => {
    try {
        const codes = await ReferralCode.find();
        res.status(200).json({ success: true, count: codes.length, data: codes });
    } catch (error) {
        console.error("Get Referral Codes Error:", error);
        res.status(500).json({ success: false, error: 'Server Error fetching codes' });
    }
};

// @desc    Add a new referral code
// @route   POST /api/v1/referralcodes
// @access  Private/Admin
exports.addReferralCode = async (req, res, next) => {
    try {
        const { code, description } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, error: 'Please provide a code value' });
        }

        // Check count limit
        const currentCount = await ReferralCode.countDocuments();
        if (currentCount >= MAX_CODES) {
            return res.status(400).json({ success: false, error: `Cannot add more than ${MAX_CODES} referral codes.` });
        }

        // Check if code already exists (case-insensitive check might be good)
        const existingCode = await ReferralCode.findOne({ code: code.trim() }); // Add trim()
        if (existingCode) {
             return res.status(400).json({ success: false, error: 'Referral code already exists.' });
        }

        const newCode = await ReferralCode.create({ code: code.trim(), description });
        res.status(201).json({ success: true, data: newCode });

    } catch (error) {
        console.error("Add Referral Code Error:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, error: messages });
        }
         if (error.code === 11000) {
             return res.status(400).json({ success: false, error: 'Referral code already exists.' });
         }
        res.status(500).json({ success: false, error: 'Server Error adding code' });
    }
};

// @desc    Delete a referral code
// @route   DELETE /api/v1/referralcodes/:id
// @access  Private/Admin
exports.deleteReferralCode = async (req, res, next) => {
    try {
        const code = await ReferralCode.findById(req.params.id);
        if (!code) {
            return res.status(404).json({ success: false, error: `Referral code not found with id ${req.params.id}` });
        }

        await code.deleteOne();
        res.status(200).json({ success: true, data: {} });

    } catch (error) {
        console.error("Delete Referral Code Error:", error);
        if (error.name === 'CastError') {
             return res.status(404).json({ success: false, error: `Referral code not found with id ${req.params.id}` });
        }
        res.status(500).json({ success: false, error: 'Server Error deleting code' });
    }
};

// @desc    Check if referral codes are required (i.e., if any exist)
// @route   GET /api/v1/referralcodes/status
// @access  Public
exports.getReferralStatus = async (req, res, next) => {
    try {
        const count = await ReferralCode.countDocuments();
        const isRequired = count > 0;
        res.status(200).json({ success: true, isRequired: isRequired });
    } catch (error) {
        console.error("Get Referral Status Error:", error);
        // Send back a generic status even on error, maybe default to required? Or false?
        // Let's default to false (not required) if there's an error checking.
        res.status(500).json({ success: false, isRequired: false, error: 'Server error checking referral status' });
    }
};
