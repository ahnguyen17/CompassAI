const User = require('../models/User');
// Add error handling utilities later if needed

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    // Authorization is handled by middleware
    const users = await User.find().select('-password');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error("Get Users Error:", error);
    res.status(500).json({ success: false, error: 'Server Error fetching users' });
  }
};

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private/Admin
exports.getUser = async (req, res, next) => {
  try {
    // Authorization handled by middleware
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, error: `User not found with id ${req.params.id}` });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Get User Error:", error);
     if (error.name === 'CastError') {
         return res.status(404).json({ success: false, error: `User not found with id ${req.params.id}` });
     }
    res.status(500).json({ success: false, error: 'Server Error fetching user' });
  }
};

// @desc    Create user (Admin functionality)
// @route   POST /api/v1/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    // Authorization handled by middleware
    const { username, email, password, role = 'user' } = req.body; // Default role to 'user'

     if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide username, email, and password' });
    }
     if (!['user', 'admin'].includes(role)) {
         return res.status(400).json({ success: false, error: 'Invalid role specified' });
     }

    // Password will be hashed by the pre-save hook
    const user = await User.create({ username, email, password, role });

    const userResponse = { ...user._doc };
    delete userResponse.password;

    res.status(201).json({ success: true, data: userResponse });
  } catch (error) {
    console.error("Create User Error:", error);
     if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ success: false, error: messages });
    }
     if (error.code === 11000) {
         return res.status(400).json({ success: false, error: 'Duplicate field value entered (email or username likely exists)' });
     }
    res.status(500).json({ success: false, error: 'Server Error creating user' });
  }
};

// @desc    Update user details (username, email, role) by Admin
// @route   PUT /api/v1/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    // Authorization handled by middleware
    const userToUpdate = await User.findById(req.params.id);

    if (!userToUpdate) {
      return res.status(404).json({ success: false, error: `User not found with id ${req.params.id}` });
    }

    // Prevent admin from changing their own role via this route
    if (userToUpdate._id.toString() === req.user.id && req.body.role && userToUpdate.role !== req.body.role) {
        return res.status(400).json({ success: false, error: 'Admins cannot change their own role via this endpoint.' });
    }
    // Note: The check preventing modification of other admins has been removed based on user feedback.
    // Admins can now change other admins' roles.


    const { username, email, role } = req.body;
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) {
        if (!['user', 'admin'].includes(role)) {
             return res.status(400).json({ success: false, error: 'Invalid role specified' });
        }
        updateData.role = role;
    }

    // Check for duplicate username/email if changed
    if (username && username !== userToUpdate.username) {
        const existingUser = await User.findOne({ username: username });
        if (existingUser) return res.status(400).json({ success: false, error: 'Username already taken' });
    }
     if (email && email !== userToUpdate.email) {
        const existingUser = await User.findOne({ email: email });
        if (existingUser) return res.status(400).json({ success: false, error: 'Email already registered' });
    }


    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!updatedUser) {
         return res.status(404).json({ success: false, error: `User not found with id ${req.params.id}` });
    }

    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    console.error("Update User Error:", error);
     if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ success: false, error: messages });
    }
     if (error.name === 'CastError') {
         return res.status(404).json({ success: false, error: `User not found with id ${req.params.id}` });
     }
      if (error.code === 11000) {
         return res.status(400).json({ success: false, error: 'Duplicate field value entered (email or username likely exists)' });
     }
    res.status(500).json({ success: false, error: 'Server Error updating user' });
  }
};

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    // Authorization handled by middleware
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: `User not found with id ${req.params.id}` });
    }

    // Prevent admin from deleting themselves or another admin
    if (user.role === 'admin') {
         return res.status(403).json({ success: false, error: 'Cannot delete admin users.' });
    }

    await user.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error("Delete User Error:", error);
     if (error.name === 'CastError') {
         return res.status(404).json({ success: false, error: `User not found with id ${req.params.id}` });
     }
    res.status(500).json({ success: false, error: 'Server Error deleting user' });
  }
};

// @desc    Admin reset user password
// @route   PUT /api/v1/users/:id/resetpassword
// @access  Private/Admin
exports.adminResetPassword = async (req, res, next) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ success: false, error: 'Please provide a new password' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long' });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, error: `User not found with id ${req.params.id}` });
        }

        // Prevent admin from resetting another admin's password or their own via this route
        if (user.role === 'admin') {
             return res.status(403).json({ success: false, error: 'Cannot reset password for admin users via this route.' });
        }

        // Set new password (pre-save hook will hash it)
        user.password = newPassword;
        await user.save();

        res.status(200).json({ success: true, message: `Password for user ${user.username} reset successfully.` });

    } catch (error) {
        console.error("Admin Reset Password Error:", error);
         if (error.name === 'CastError') {
            return res.status(404).json({ success: false, error: `User not found with id ${req.params.id}` });
        }
        res.status(500).json({ success: false, error: 'Server Error resetting user password' });
    }
};
