const User = require('../models/User');
const ReferralCode = require('../models/ReferralCode'); // Import ReferralCode model

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, referralCode } = req.body;

    // Basic validation (always require username, email, password)
    if (!username || !email || !password) {
       return res.status(400).json({ success: false, error: 'Please provide username, email, and password' });
    }

    // --- Conditional Referral Code Validation ---
    const referralCodesExist = await ReferralCode.countDocuments() > 0;

    if (referralCodesExist) {
        // If codes exist, the field is required and must be valid
        if (!referralCode || !referralCode.trim()) {
             return res.status(400).json({ success: false, error: 'Referral code is required.' });
        }
        const validCode = await ReferralCode.findOne({ code: referralCode.trim() });
        if (!validCode) {
            return res.status(400).json({ success: false, error: 'Invalid referral code.' });
        }
        // Optional: Implement usage limits/expiration checks here
    }
    // If no referral codes exist in the DB, we ignore the referralCode field entirely
    // --- End Conditional Referral Code Validation ---


    // Check if user already exists (email or username)
    let user = await User.findOne({ email });
    if (user) {
        return res.status(400).json({ success: false, error: 'User already exists with this email' });
    }
    user = await User.findOne({ username });
     if (user) {
        return res.status(400).json({ success: false, error: 'Username is already taken' });
    }

    // Create user
    user = await User.create({
      username,
      email,
      password, // Password will be hashed by the pre-save hook in User model
    });

    sendTokenResponse(user, 201, res); // Use 201 for resource creation

  } catch (error) {
    console.error("Registration Error:", error); // Log the error
    // Handle potential Mongoose validation errors
     if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ success: false, error: messages });
    }
    res.status(500).json({ success: false, error: 'Server Error during registration' });
    // next(error); // Pass to a potential error handling middleware
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { loginIdentifier, password } = req.body; // Use a generic identifier

    // Validate identifier & password presence
    if (!loginIdentifier || !password) {
      return res.status(400).json({ success: false, error: 'Please provide an email/username and password' });
    }

    // Check for user by email OR username
    const user = await User.findOne({
       $or: [{ email: loginIdentifier }, { username: loginIdentifier }]
    }).select('+password'); // Explicitly select password

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' }); // Use 401 for unauthorized
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' }); // Use 401
    }

    sendTokenResponse(user, 200, res);

  } catch (error) {
     console.error("Login Error:", error); // Log the error
     res.status(500).json({ success: false, error: 'Server Error during login' });
    // next(error);
  }
};

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    // Calculate expiration based on JWT_EXPIRE (assuming it's like '30d')
    expires: new Date(
        Date.now() + parseInt(process.env.JWT_EXPIRE || '30d', 10) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // Cookie cannot be accessed by client-side scripts
  };


  // Set secure flag in production
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  // We'll send the token in the response body for now.
  // Sending it in a cookie (options above) is generally more secure for web apps.
  res
    .status(statusCode)
    // .cookie('token', token, options) // Optional: send as cookie
    .json({
      success: true,
      token,
      // Optionally return user data (excluding password)
      // user: { _id: user._id, username: user.username, email: user.email }
    });
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private (requires protect middleware)
exports.getMe = async (req, res, next) => {
  // req.user is set by the protect middleware
  // We already fetched the user in protect, so we can just send req.user
  // Ensure password is not somehow included if select('-password') failed in protect
  const userData = { ...req.user._doc }; // Use ._doc to get plain object if needed
  delete userData.password;

  res.status(200).json({
    success: true,
    data: userData
   });
};


// @desc    Update user details (username, email) for logged-in user
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res, next) => {
    try {
        const { username, email } = req.body;
        const fieldsToUpdate = {};

        if (username) fieldsToUpdate.username = username;
        if (email) fieldsToUpdate.email = email;

        // Check if there's anything to update
        if (Object.keys(fieldsToUpdate).length === 0) {
             return res.status(400).json({ success: false, error: 'Please provide username or email to update' });
        }

        // Check if new username or email is already taken by another user
        if (username) {
            const existingUser = await User.findOne({ username: username });
            if (existingUser && existingUser._id.toString() !== req.user.id) {
                return res.status(400).json({ success: false, error: 'Username already taken' });
            }
        }
        if (email) {
            const existingUser = await User.findOne({ email: email });
             if (existingUser && existingUser._id.toString() !== req.user.id) {
                return res.status(400).json({ success: false, error: 'Email already registered' });
            }
        }

        const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
            new: true, // Return the updated document
            runValidators: true // Run schema validators
        });

        // Ensure user exists (should always exist due to 'protect' middleware)
        if (!user) {
             return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Exclude password from response
        const userData = { ...user._doc };
        delete userData.password;

        res.status(200).json({
            success: true,
            data: userData
        });

    } catch (error) {
        console.error("Update Details Error:", error);
         if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, error: messages });
        }
        res.status(500).json({ success: false, error: 'Server Error during details update' });
    }
};

// @desc    Update password for logged-in user
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: 'Please provide current and new password' });
        }

         if (newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long' });
        }

        // Get user from DB, ensuring password is selected
        const user = await User.findById(req.user.id).select('+password');

        // Check if user exists (should always exist due to 'protect' middleware)
        if (!user) {
             return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Check if current password matches
        const isMatch = await user.matchPassword(currentPassword);

        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Incorrect current password' });
        }

        // Set new password (pre-save hook will hash it)
        user.password = newPassword;
        await user.save();

        // Send back a new token (optional, but good practice after password change)
        sendTokenResponse(user, 200, res);

    } catch (error) {
        console.error("Update Password Error:", error);
        res.status(500).json({ success: false, error: 'Server Error during password update' });
    }
};
