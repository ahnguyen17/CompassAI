const User = require('../models/User');
// Add error handling utilities later if needed

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    // TODO: Add authorization check (e.g., only allow admins)
    // if (req.user.role !== 'admin') { ... }

    // Exclude passwords from the result even though the model schema tries to hide it
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
    // TODO: Add authorization check

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

// @desc    Create user (Admin functionality, different from public registration)
// @route   POST /api/v1/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    // TODO: Add authorization check

    const { username, email, password /*, role */ } = req.body; // Add role if implementing roles

     if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide username, email, and password' });
    }

    // Password will be hashed by the pre-save hook
    const user = await User.create({ username, email, password /*, role */ });

    // Don't send back the password in the response
    const userResponse = { ...user._doc };
    delete userResponse.password;


    res.status(201).json({ success: true, data: userResponse });
  } catch (error) {
    console.error("Create User Error:", error);
     if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ success: false, error: messages });
    }
     if (error.code === 11000) { // Handle duplicate key error (e.g., email or username)
         return res.status(400).json({ success: false, error: 'Duplicate field value entered (email or username likely exists)' });
     }
    res.status(500).json({ success: false, error: 'Server Error creating user' });
  }
};

// @desc    Update user details (e.g., username, email, potentially role)
// @route   PUT /api/v1/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    // TODO: Add authorization check

    const userToUpdate = await User.findById(req.params.id);

    if (!userToUpdate) {
      return res.status(404).json({ success: false, error: `User not found with id ${req.params.id}` });
    }

    // Prevent admin from changing their own role
    if (userToUpdate._id.toString() === req.user.id && req.body.role && userToUpdate.role !== req.body.role) {
        return res.status(400).json({ success: false, error: 'Admins cannot change their own role.' });
    }

    // Fields that can be updated by an admin
    const { username, email, role /*, isActive */ } = req.body;
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined && ['user', 'admin'].includes(role)) { // Validate role
         updateData.role = role;
    }
    // if (isActive !== undefined) updateData.isActive = isActive;

    // Note: Password updates should go through a separate endpoint.

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    // findByIdAndUpdate doesn't return error if not found with new:false, so check updatedUser
    if (!updatedUser) {
         // This case might be redundant due to the initial findById check, but good practice
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
    // TODO: Add authorization check

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: `User not found with id ${req.params.id}` });
    }

    // TODO: Consider what happens to user's chat sessions/messages upon deletion.
    // Maybe mark user as inactive instead of hard delete? Or cascade delete?
    // For now, just delete the user document.
    await user.deleteOne();

    res.status(200).json({ success: true, data: {} }); // Indicate successful deletion
  } catch (error) {
    console.error("Delete User Error:", error);
     if (error.name === 'CastError') {
         return res.status(404).json({ success: false, error: `User not found with id ${req.params.id}` });
     }
    res.status(500).json({ success: false, error: 'Server Error deleting user' });
  }
};
