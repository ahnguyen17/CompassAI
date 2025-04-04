const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage'); // Needed for deleting messages on session delete
const { v4: uuidv4 } = require('uuid');
// Add error handling utilities later if needed

// @desc    Get all chat sessions for the logged-in user
// @route   GET /api/v1/chatsessions
// @access  Private
exports.getChatSessions = async (req, res, next) => {
  try {
    // Find sessions belonging to the logged-in user (req.user set by protect middleware)
    // Sort by creation date, newest first
    const sessions = await ChatSession.find({ user: req.user.id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    console.error("Get Chat Sessions Error:", error);
    res.status(500).json({ success: false, error: 'Server Error fetching chat sessions' });
  }
};

// @desc    Get a single chat session (including messages - TBD)
// @route   GET /api/v1/chatsessions/:id
// @access  Private
exports.getChatSession = async (req, res, next) => {
  try {
    const session = await ChatSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, error: `Chat session not found with id ${req.params.id}` });
    }

    // Ensure the logged-in user owns this session
    if (session.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'User not authorized to access this session' });
    }

    // TODO: Optionally populate messages here or have a separate endpoint for messages
    // const messages = await ChatMessage.find({ session: session._id }).sort({ timestamp: 1 });

    res.status(200).json({
      success: true,
      data: session,
      // messages: messages // Include if fetching messages here
    });
  } catch (error) {
    console.error("Get Chat Session Error:", error);
     if (error.name === 'CastError') {
         return res.status(404).json({ success: false, error: `Chat session not found with id ${req.params.id}` });
     }
    res.status(500).json({ success: false, error: 'Server Error fetching chat session' });
  }
};

// @desc    Create a new chat session
// @route   POST /api/v1/chatsessions
// @access  Private
exports.createChatSession = async (req, res, next) => {
  try {
    // Associate the session with the logged-in user
    const sessionData = { ...req.body, user: req.user.id };

    // Title might be optional initially, set later based on first message
    if (!sessionData.title) {
        sessionData.title = "New Chat"; // Default title
    }

    const session = await ChatSession.create(sessionData);

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error("Create Chat Session Error:", error);
     if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ success: false, error: messages });
    }
    res.status(500).json({ success: false, error: 'Server Error creating chat session' });
  }
};

// @desc    Update chat session (e.g., title, sharing status)
// @route   PUT /api/v1/chatsessions/:id
// @access  Private
exports.updateChatSession = async (req, res, next) => {
  try {
    let session = await ChatSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, error: `Chat session not found with id ${req.params.id}` });
    }

    // Ensure user owns the session
    if (session.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'User not authorized to update this session' });
    }

    const { title, isShared } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (isShared !== undefined) {
        updateData.isShared = isShared;
        // Generate shareId if sharing is enabled and ID doesn't exist
        if (isShared && !session.shareId) {
            updateData.shareId = uuidv4();
        }
        // Optionally remove shareId if sharing is disabled
        // else if (!isShared && session.shareId) {
        //     updateData.shareId = null; // Or undefined, depending on schema/preference
        // }
    }

    session = await ChatSession.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error("Update Chat Session Error:", error);
     if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ success: false, error: messages });
    }
     if (error.name === 'CastError') {
         return res.status(404).json({ success: false, error: `Chat session not found with id ${req.params.id}` });
     }
    res.status(500).json({ success: false, error: 'Server Error updating chat session' });
  }
};

// @desc    Delete chat session (and its messages)
// @route   DELETE /api/v1/chatsessions/:id
// @access  Private
exports.deleteChatSession = async (req, res, next) => {
  try {
    const session = await ChatSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, error: `Chat session not found with id ${req.params.id}` });
    }

    // Ensure user owns the session
    if (session.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'User not authorized to delete this session' });
    }

    // Delete associated messages first
    await ChatMessage.deleteMany({ session: session._id });

    // Then delete the session
    await session.deleteOne();

    res.status(200).json({
      success: true,
      data: {}, // Indicate successful deletion
    });
  } catch (error) {
    console.error("Delete Chat Session Error:", error);
     if (error.name === 'CastError') {
         return res.status(404).json({ success: false, error: `Chat session not found with id ${req.params.id}` });
     }
    res.status(500).json({ success: false, error: 'Server Error deleting chat session' });
  }
};

// @desc    Get a shared chat session by shareId
// @route   GET /api/v1/chatsessions/shared/:shareId
// @access  Public
exports.getSharedChatSession = async (req, res, next) => {
    try {
        const session = await ChatSession.findOne({ shareId: req.params.shareId, isShared: true });

        if (!session) {
            return res.status(404).json({ success: false, error: 'Shared chat session not found or sharing disabled' });
        }

        // Fetch associated messages for the shared session
        const messages = await ChatMessage.find({ session: session._id }).sort({ timestamp: 1 }).select('-session'); // Exclude session ID from messages

        // Optionally fetch minimal user info (e.g., username) if needed, be careful about privacy
        // const user = await User.findById(session.user).select('username');

        res.status(200).json({
            success: true,
            data: {
                _id: session._id,
                title: session.title,
                createdAt: session.createdAt,
                // user: user ? { username: user.username } : null, // Example user info
                messages: messages
            }
        });

    } catch (error) {
        console.error("Get Shared Chat Session Error:", error);
        res.status(500).json({ success: false, error: 'Server Error fetching shared chat session' });
    }
};
