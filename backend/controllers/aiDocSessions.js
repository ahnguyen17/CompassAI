const AIDocSession = require('../models/AIDocSession');
const AIDocMessage = require('../models/AIDocMessage');

// @desc    Get all AIDoc sessions for logged-in user
// @route   GET /api/v1/aidocsessions
// @access  Private
exports.getAIDocSessions = async (req, res, next) => {
  try {
    const sessions = await AIDocSession.find({ user: req.user.id })
      .sort({ lastMessageTimestamp: -1, lastAccessedAt: -1 });

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    console.error('Get AIDoc Sessions Error:', error);
    res.status(500).json({ success: false, error: 'Server Error fetching AIDoc sessions' });
  }
};

// @desc    Get single AIDoc session
// @route   GET /api/v1/aidocsessions/:id
// @access  Private
exports.getAIDocSession = async (req, res, next) => {
  try {
    const session = await AIDocSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: `AIDoc session not found with id ${req.params.id}`,
      });
    }

    // Check ownership
    if (session.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'User not authorized to access this AIDoc session',
      });
    }

    // Update lastAccessedAt
    session.lastAccessedAt = Date.now();
    await session.save();

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Get AIDoc Session Error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: `AIDoc session not found with id ${req.params.id}`,
      });
    }
    res.status(500).json({ success: false, error: 'Server Error fetching AIDoc session' });
  }
};

// @desc    Create new AIDoc session
// @route   POST /api/v1/aidocsessions
// @access  Private
exports.createAIDocSession = async (req, res, next) => {
  try {
    const { title, systemPrompt, modelUsed } = req.body;

    const session = await AIDocSession.create({
      user: req.user.id,
      title: title || 'New Medical Consultation',
      systemPrompt: systemPrompt || '',
      modelUsed: modelUsed || '',
      lastMessageTimestamp: Date.now(),
    });

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Create AIDoc Session Error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ success: false, error: messages });
    }
    res.status(500).json({ success: false, error: 'Server Error creating AIDoc session' });
  }
};

// @desc    Update AIDoc session
// @route   PUT /api/v1/aidocsessions/:id
// @access  Private
exports.updateAIDocSession = async (req, res, next) => {
  try {
    let session = await AIDocSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: `AIDoc session not found with id ${req.params.id}`,
      });
    }

    // Check ownership
    if (session.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'User not authorized to update this AIDoc session',
      });
    }

    // Update allowed fields
    const { title, systemPrompt, modelUsed } = req.body;
    if (title !== undefined) session.title = title;
    if (systemPrompt !== undefined) session.systemPrompt = systemPrompt;
    if (modelUsed !== undefined) session.modelUsed = modelUsed;

    await session.save();

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Update AIDoc Session Error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: `AIDoc session not found with id ${req.params.id}`,
      });
    }
    res.status(500).json({ success: false, error: 'Server Error updating AIDoc session' });
  }
};

// @desc    Delete AIDoc session
// @route   DELETE /api/v1/aidocsessions/:id
// @access  Private
exports.deleteAIDocSession = async (req, res, next) => {
  try {
    const session = await AIDocSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: `AIDoc session not found with id ${req.params.id}`,
      });
    }

    // Check ownership
    if (session.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'User not authorized to delete this AIDoc session',
      });
    }

    // Delete all messages associated with this session
    await AIDocMessage.deleteMany({ session: req.params.id });

    // Delete the session
    await session.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.error('Delete AIDoc Session Error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: `AIDoc session not found with id ${req.params.id}`,
      });
    }
    res.status(500).json({ success: false, error: 'Server Error deleting AIDoc session' });
  }
};

