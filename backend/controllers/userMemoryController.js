const mongoose = require('mongoose');
const UserMemory = require('../models/UserMemory');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get user memory settings and contexts
// @route   GET /api/v1/usermemory
// @access  Private
exports.getUserMemory = asyncHandler(async (req, res, next) => {
  let userMemory = await UserMemory.findOne({ userId: req.user.id });

  if (!userMemory) {
    // If no memory document exists, create one with default settings
    userMemory = await UserMemory.create({ userId: req.user.id });
  }

  // Ensure contexts are sorted by updatedAt descending before sending to client
  // The pre-save hook handles this, but good to be sure if there are other ways contexts could be modified.
  // For a GET, the stored order should be fine.
  if (userMemory.contexts && userMemory.contexts.length > 0) {
    userMemory.contexts.sort((a, b) => {
        const dateA = a.updatedAt || a.createdAt;
        const dateB = b.updatedAt || b.createdAt;
        return dateB.getTime() - dateA.getTime();
      });
  }


  res.status(200).json({
    success: true,
    data: userMemory,
  });
});

// @desc    Update user memory global settings (isGloballyEnabled, maxContexts)
// @route   PUT /api/v1/usermemory/settings
// @access  Private
exports.updateUserMemorySettings = asyncHandler(async (req, res, next) => {
  const { isGloballyEnabled, maxContexts } = req.body;

  const fieldsToUpdate = {};
  if (typeof isGloballyEnabled === 'boolean') {
    fieldsToUpdate.isGloballyEnabled = isGloballyEnabled;
  }
  if (typeof maxContexts === 'number') {
    if (maxContexts < 1 || maxContexts > 200) {
        return next(
            new ErrorResponse('maxContexts must be between 1 and 200.', 400)
        );
    }
    fieldsToUpdate.maxContexts = maxContexts;
  }

  if (Object.keys(fieldsToUpdate).length === 0) {
    return next(new ErrorResponse('No settings provided to update.', 400));
  }

  let userMemory = await UserMemory.findOneAndUpdate(
    { userId: req.user.id },
    { $set: fieldsToUpdate },
    { new: true, upsert: true, runValidators: true } // upsert will create if not exists
  );

  res.status(200).json({
    success: true,
    data: userMemory,
  });
});

// @desc    Add a new context item to user memory
// @route   POST /api/v1/usermemory/contexts
// @access  Private
exports.addContext = asyncHandler(async (req, res, next) => {
  const { text, source = 'manual' } = req.body;

  if (!text || text.trim() === '') {
    return next(new ErrorResponse('Context text cannot be empty.', 400));
  }
  if (!['manual', 'chat_auto_extracted'].includes(source)) {
    return next(new ErrorResponse('Invalid context source.', 400));
  }

  let userMemory = await UserMemory.findOne({ userId: req.user.id });

  if (!userMemory) {
    userMemory = await UserMemory.create({ userId: req.user.id });
  }

  // Check for uniqueness (exact match for text)
  const existingContextIndex = userMemory.contexts.findIndex(
    (c) => c.text === text.trim()
  );

  const now = new Date();

  if (existingContextIndex > -1) {
    // If text exists, update its timestamp to make it most recent
    userMemory.contexts[existingContextIndex].updatedAt = now;
    // Optionally update source if it's different, though 'manual' usually takes precedence
    if (source === 'manual' && userMemory.contexts[existingContextIndex].source !== 'manual') {
        userMemory.contexts[existingContextIndex].source = 'manual';
    }
  } else {
    // Add new context item
    userMemory.contexts.push({ text: text.trim(), source, createdAt: now, updatedAt: now });
  }
  
  // The pre-save hook on UserMemory model will handle sorting and trimming to maxContexts
  await userMemory.save();

  // Re-fetch to ensure the returned data reflects the sorted/trimmed array by pre-save hook
  const updatedUserMemory = await UserMemory.findById(userMemory._id);


  res.status(201).json({
    success: true,
    data: updatedUserMemory, // Send back the whole updated memory document
  });
});

// @desc    Update an existing context item
// @route   PUT /api/v1/usermemory/contexts/:contextId
// @access  Private
exports.updateContext = asyncHandler(async (req, res, next) => {
  const { contextId } = req.params;
  const { text } = req.body;

  if (!text || text.trim() === '') {
    return next(new ErrorResponse('Context text cannot be empty.', 400));
  }
  if (!mongoose.Types.ObjectId.isValid(contextId)) {
    return next(new ErrorResponse(`Invalid context ID: ${contextId}`, 400));
  }

  let userMemory = await UserMemory.findOne({ userId: req.user.id });

  if (!userMemory) {
    return next(new ErrorResponse('User memory not found.', 404));
  }

  const contextItem = userMemory.contexts.id(contextId);

  if (!contextItem) {
    return next(new ErrorResponse(`Context item with ID ${contextId} not found.`, 404));
  }

  // Check if the new text would conflict with another existing context item
  const conflictingContext = userMemory.contexts.find(c => c.text === text.trim() && c._id.toString() !== contextId);
  if (conflictingContext) {
    return next(new ErrorResponse('Another context with the same text already exists. Please merge or use a different text.', 400));
  }

  contextItem.text = text.trim();
  contextItem.updatedAt = new Date();
  // Source remains unchanged on edit, typically.

  await userMemory.save();
  
  // Re-fetch to ensure the returned data reflects the sorted/trimmed array by pre-save hook
  const updatedUserMemory = await UserMemory.findById(userMemory._id);

  res.status(200).json({
    success: true,
    data: updatedUserMemory,
  });
});

// @desc    Delete a specific context item
// @route   DELETE /api/v1/usermemory/contexts/:contextId
// @access  Private
exports.deleteContext = asyncHandler(async (req, res, next) => {
  const { contextId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(contextId)) {
    return next(new ErrorResponse(`Invalid context ID: ${contextId}`, 400));
  }

  let userMemory = await UserMemory.findOne({ userId: req.user.id });

  if (!userMemory) {
    return next(new ErrorResponse('User memory not found.', 404));
  }

  const contextItem = userMemory.contexts.id(contextId);

  if (!contextItem) {
    return next(new ErrorResponse(`Context item with ID ${contextId} not found.`, 404));
  }

  // Mongoose subdocument removal
  contextItem.remove(); // or userMemory.contexts.pull(contextId); and then save
  
  await userMemory.save();

  // Re-fetch to ensure the returned data reflects the sorted/trimmed array by pre-save hook
  const updatedUserMemory = await UserMemory.findById(userMemory._id);

  res.status(200).json({
    success: true,
    data: updatedUserMemory, // Or simply { success: true, data: {} } if no body needed
  });
});

// @desc    Clear all context items for a user
// @route   POST /api/v1/usermemory/contexts/clear
// @access  Private
exports.clearAllContexts = asyncHandler(async (req, res, next) => {
  let userMemory = await UserMemory.findOne({ userId: req.user.id });

  if (!userMemory) {
    // If no memory, effectively already cleared or doesn't exist to clear
    userMemory = await UserMemory.create({ userId: req.user.id, contexts: [] });
     return res.status(200).json({
      success: true,
      data: userMemory
    });
  }

  userMemory.contexts = [];
  await userMemory.save();

  res.status(200).json({
    success: true,
    data: userMemory,
  });
});
