const jwt = require('jsonwebtoken');
const User = require('../models/User');
// Add error handling utilities later if needed

exports.protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header (Bearer token)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Optional: Check for token in cookies if you decide to use them
  // else if (req.cookies.token) {
  //   token = req.cookies.token;
  // }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route (no token)' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID from token payload and attach to request object
    // Exclude password even though it's not selected by default, just to be safe
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
        // Handle case where user associated with token no longer exists
         return res.status(401).json({ success: false, error: 'Not authorized to access this route (user not found)' });
    }

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    // Handle specific JWT errors (e.g., expired token)
    if (error.name === 'JsonWebTokenError') {
         return res.status(401).json({ success: false, error: 'Not authorized to access this route (invalid token)' });
    }
     if (error.name === 'TokenExpiredError') {
         return res.status(401).json({ success: false, error: 'Not authorized to access this route (token expired)' });
    }
    // Generic error
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // req.user should be set by the 'protect' middleware running before this
    if (!req.user) {
        // This shouldn't happen if 'protect' runs first, but good to check
         return res.status(401).json({ success: false, error: 'Not authorized (user not found)' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ // 403 Forbidden
        success: false,
        error: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};
