const CustomAI = require('../models/CustomAI');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const { extractTextFromFile, validateKnowledgeBaseFile, getFileTypeFromExtension } = require('../utils/fileProcessor');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Initialize S3 client
const getS3Client = () => {
  return new S3Client({
    region: process.env.AWS_S3_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
};

// @desc    Get all custom AIs for the authenticated user
// @route   GET /api/v1/customai
// @access  Private
exports.getCustomAIs = asyncHandler(async (req, res, next) => {
  const customAIs = await CustomAI.findByUserId(req.user.id);
  
  res.status(200).json({
    success: true,
    count: customAIs.length,
    data: customAIs
  });
});

// @desc    Get single custom AI
// @route   GET /api/v1/customai/:id
// @access  Private
exports.getCustomAI = asyncHandler(async (req, res, next) => {
  const customAI = await CustomAI.findById(req.params.id);
  
  if (!customAI) {
    return next(new ErrorResponse(`Custom AI not found with id of ${req.params.id}`, 404));
  }
  
  // Check if the custom AI belongs to the authenticated user
  if (customAI.userId.toString() !== req.user.id) {
    return next(new ErrorResponse('Not authorized to access this custom AI', 403));
  }
  
  res.status(200).json({
    success: true,
    data: customAI
  });
});

// @desc    Create new custom AI
// @route   POST /api/v1/customai
// @access  Private
exports.createCustomAI = asyncHandler(async (req, res, next) => {
  const { name, model, instructions } = req.body;
  
  // Validate required fields
  if (!name || !model || !instructions) {
    return next(new ErrorResponse('Name, model, and instructions are required', 400));
  }
  
  // Check if user already has a custom AI with this name
  const existingAI = await CustomAI.findOne({ userId: req.user.id, name, isActive: true });
  if (existingAI) {
    return next(new ErrorResponse('You already have a custom AI with this name', 400));
  }
  
  // Create custom AI
  const customAI = await CustomAI.create({
    userId: req.user.id,
    name,
    model,
    instructions,
    knowledgeBaseFiles: []
  });
  
  res.status(201).json({
    success: true,
    data: customAI
  });
});

// @desc    Update custom AI
// @route   PUT /api/v1/customai/:id
// @access  Private
exports.updateCustomAI = asyncHandler(async (req, res, next) => {
  let customAI = await CustomAI.findById(req.params.id);
  
  if (!customAI) {
    return next(new ErrorResponse(`Custom AI not found with id of ${req.params.id}`, 404));
  }
  
  // Check if the custom AI belongs to the authenticated user
  if (customAI.userId.toString() !== req.user.id) {
    return next(new ErrorResponse('Not authorized to update this custom AI', 403));
  }
  
  const { name, model, instructions } = req.body;
  
  // If name is being changed, check for duplicates
  if (name && name !== customAI.name) {
    const existingAI = await CustomAI.findOne({ 
      userId: req.user.id, 
      name, 
      isActive: true,
      _id: { $ne: req.params.id }
    });
    if (existingAI) {
      return next(new ErrorResponse('You already have a custom AI with this name', 400));
    }
  }
  
  // Update fields
  if (name) customAI.name = name;
  if (model) customAI.model = model;
  if (instructions) customAI.instructions = instructions;
  
  await customAI.save();
  
  res.status(200).json({
    success: true,
    data: customAI
  });
});

// @desc    Delete custom AI
// @route   DELETE /api/v1/customai/:id
// @access  Private
exports.deleteCustomAI = asyncHandler(async (req, res, next) => {
  const customAI = await CustomAI.findById(req.params.id);
  
  if (!customAI) {
    return next(new ErrorResponse(`Custom AI not found with id of ${req.params.id}`, 404));
  }
  
  // Check if the custom AI belongs to the authenticated user
  if (customAI.userId.toString() !== req.user.id) {
    return next(new ErrorResponse('Not authorized to delete this custom AI', 403));
  }
  
  // Delete associated files from S3
  const s3Client = getS3Client();
  for (const file of customAI.knowledgeBaseFiles) {
    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: file.fileName
      }));
    } catch (error) {
      console.error(`Error deleting file ${file.fileName} from S3:`, error);
      // Continue with deletion even if S3 cleanup fails
    }
  }
  
  // Soft delete by setting isActive to false
  customAI.isActive = false;
  await customAI.save();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Duplicate custom AI
// @route   POST /api/v1/customai/:id/duplicate
// @access  Private
exports.duplicateCustomAI = asyncHandler(async (req, res, next) => {
  const originalAI = await CustomAI.findById(req.params.id);
  
  if (!originalAI) {
    return next(new ErrorResponse(`Custom AI not found with id of ${req.params.id}`, 404));
  }
  
  // Check if the custom AI belongs to the authenticated user
  if (originalAI.userId.toString() !== req.user.id) {
    return next(new ErrorResponse('Not authorized to duplicate this custom AI', 403));
  }
  
  // Generate a unique name for the duplicate
  let duplicateName = `${originalAI.name} (Copy)`;
  let counter = 1;
  
  while (await CustomAI.findOne({ userId: req.user.id, name: duplicateName, isActive: true })) {
    counter++;
    duplicateName = `${originalAI.name} (Copy ${counter})`;
  }
  
  // Create duplicate (without knowledge base files for now)
  const duplicateAI = await CustomAI.create({
    userId: req.user.id,
    name: duplicateName,
    model: originalAI.model,
    instructions: originalAI.instructions,
    knowledgeBaseFiles: [] // Files will need to be re-uploaded
  });
  
  res.status(201).json({
    success: true,
    data: duplicateAI
  });
});

// @desc    Upload knowledge base file
// @route   POST /api/v1/customai/:id/files
// @access  Private
exports.uploadKnowledgeBaseFile = asyncHandler(async (req, res, next) => {
  const customAI = await CustomAI.findById(req.params.id);
  
  if (!customAI) {
    return next(new ErrorResponse(`Custom AI not found with id of ${req.params.id}`, 404));
  }
  
  // Check if the custom AI belongs to the authenticated user
  if (customAI.userId.toString() !== req.user.id) {
    return next(new ErrorResponse('Not authorized to upload files to this custom AI', 403));
  }
  
  if (!req.file) {
    return next(new ErrorResponse('Please upload a file', 400));
  }
  
  // Validate file
  const validation = validateKnowledgeBaseFile(req.file);
  if (!validation.isValid) {
    return next(new ErrorResponse(validation.error, 400));
  }
  
  // Check file limit
  if (customAI.knowledgeBaseFiles.length >= 10) {
    return next(new ErrorResponse('Maximum of 10 files allowed per custom AI', 400));
  }
  
  // Upload file to S3
  const s3Client = getS3Client();
  const fileExtension = path.extname(req.file.originalname);
  const s3Key = `custom-ai/${customAI._id}/${uuidv4()}${fileExtension}`;
  
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));
    
    const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${s3Key}`;
    
    // Extract text from file
    let extractedText = '';
    let processingStatus = 'completed';
    let processingError = '';
    
    try {
      extractedText = await extractTextFromFile(req.file.buffer, req.file.originalname, req.file.mimetype);
    } catch (error) {
      console.error('Error extracting text:', error);
      processingStatus = 'failed';
      processingError = error.message;
    }
    
    // Add file to custom AI
    const fileData = {
      originalName: req.file.originalname,
      fileName: s3Key,
      filePath: s3Url,
      fileType: getFileTypeFromExtension(req.file.originalname),
      fileSize: req.file.size,
      extractedText,
      processingStatus,
      processingError
    };
    
    customAI.knowledgeBaseFiles.push(fileData);
    await customAI.save();
    
    res.status(200).json({
      success: true,
      data: fileData
    });
    
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    return next(new ErrorResponse('Failed to upload file', 500));
  }
});

// @desc    Delete knowledge base file
// @route   DELETE /api/v1/customai/:id/files/:fileId
// @access  Private
exports.deleteKnowledgeBaseFile = asyncHandler(async (req, res, next) => {
  const customAI = await CustomAI.findById(req.params.id);

  if (!customAI) {
    return next(new ErrorResponse(`Custom AI not found with id of ${req.params.id}`, 404));
  }

  // Check if the custom AI belongs to the authenticated user
  if (customAI.userId.toString() !== req.user.id) {
    return next(new ErrorResponse('Not authorized to delete files from this custom AI', 403));
  }

  // Find the file
  const fileIndex = customAI.knowledgeBaseFiles.findIndex(
    file => file._id.toString() === req.params.fileId
  );

  if (fileIndex === -1) {
    return next(new ErrorResponse('File not found', 404));
  }

  const file = customAI.knowledgeBaseFiles[fileIndex];

  // Delete from S3
  const s3Client = getS3Client();
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: file.fileName
    }));
  } catch (error) {
    console.error(`Error deleting file ${file.fileName} from S3:`, error);
    // Continue with removal from database even if S3 deletion fails
  }

  // Remove from array
  customAI.knowledgeBaseFiles.splice(fileIndex, 1);
  await customAI.save();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get custom AI for chat (includes knowledge base text)
// @route   GET /api/v1/customai/:id/chat-context
// @access  Private
exports.getCustomAIForChat = asyncHandler(async (req, res, next) => {
  const customAI = await CustomAI.findById(req.params.id);

  if (!customAI) {
    return next(new ErrorResponse(`Custom AI not found with id of ${req.params.id}`, 404));
  }

  // Check if the custom AI belongs to the authenticated user
  if (customAI.userId.toString() !== req.user.id) {
    return next(new ErrorResponse('Not authorized to access this custom AI', 403));
  }

  // Return custom AI with knowledge base text
  const chatContext = {
    _id: customAI._id,
    name: customAI.name,
    model: customAI.model,
    instructions: customAI.instructions,
    knowledgeBaseText: customAI.getKnowledgeBaseText(),
    fileCount: customAI.knowledgeBaseFiles.length,
    totalSize: customAI.getTotalKnowledgeBaseSize()
  };

  res.status(200).json({
    success: true,
    data: chatContext
  });
});
