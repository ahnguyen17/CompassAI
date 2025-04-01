const User = require('../models/User');
const ReferralCode = require('../models/ReferralCode'); // Import ReferralCode model

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, referralCode } = req.body; // Add referralCode

    // Basic validation
    if (!username || !email || !password || !referralCode) {
      return res.status(400).json({ success: false, error: 'Please provide username, email, password, and referral code' });
    }

    // --- Referral Code Validation ---
    const validCode = await ReferralCode.findOne({ code: referralCode.trim() });
    if (!validCode) {
        return res.status(400).json({ success: false, error: 'Invalid referral code.' });
    }
    // Optional: Implement usage limits/expiration checks here if added to the model
    // --- End Referral Code Validation ---


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
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000 // Convert days to ms
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

// Placeholder for getting current logged in user (requires authentication middleware)
// @desc    Get current logged in user
// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
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
