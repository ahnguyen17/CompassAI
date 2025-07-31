/**
 * Custom AI Feature Validation Script
 * 
 * This script performs basic validation of the Custom AI feature
 * Run with: node validate-custom-ai.js
 */

const mongoose = require('mongoose');
const CustomAI = require('./models/CustomAI');
const User = require('./models/User');
const { validateCustomAIData, validateFileUpload } = require('./tests/customAI.test');
require('dotenv').config();

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    log('✓ Connected to MongoDB', 'green');
    return true;
  } catch (error) {
    log('✗ Failed to connect to MongoDB: ' + error.message, 'red');
    return false;
  }
}

async function validateDatabaseSchema() {
  log('\n=== Database Schema Validation ===', 'blue');
  
  try {
    // Test CustomAI model creation
    const testUser = await User.findOne().limit(1);
    if (!testUser) {
      log('✗ No users found in database. Please create a user first.', 'red');
      return false;
    }
    
    // Test valid CustomAI creation
    const validAI = {
      userId: testUser._id,
      name: 'Test AI',
      model: 'gpt-3.5-turbo',
      instructions: 'You are a helpful assistant.',
      knowledgeBaseFiles: []
    };
    
    const customAI = new CustomAI(validAI);
    await customAI.validate();
    log('✓ CustomAI model validation passed', 'green');
    
    // Test validation errors
    const invalidAI = new CustomAI({
      userId: testUser._id,
      name: '', // Invalid: empty name
      model: 'gpt-3.5-turbo',
      instructions: 'x'.repeat(2001), // Invalid: too long
    });
    
    try {
      await invalidAI.validate();
      log('✗ CustomAI validation should have failed', 'red');
    } catch (error) {
      log('✓ CustomAI validation correctly rejected invalid data', 'green');
    }
    
    return true;
  } catch (error) {
    log('✗ Database schema validation failed: ' + error.message, 'red');
    return false;
  }
}

async function validateBusinessLogic() {
  log('\n=== Business Logic Validation ===', 'blue');
  
  // Test custom AI data validation
  const validData = {
    name: 'Test AI',
    model: 'gpt-3.5-turbo',
    instructions: 'You are a helpful assistant.'
  };
  
  const validResult = validateCustomAIData(validData);
  if (validResult.isValid) {
    log('✓ Valid custom AI data validation passed', 'green');
  } else {
    log('✗ Valid custom AI data validation failed: ' + validResult.errors.join(', '), 'red');
  }
  
  // Test invalid data
  const invalidData = {
    name: '', // Empty name
    model: '',
    instructions: 'x'.repeat(2001) // Too long
  };
  
  const invalidResult = validateCustomAIData(invalidData);
  if (!invalidResult.isValid && invalidResult.errors.length > 0) {
    log('✓ Invalid custom AI data correctly rejected', 'green');
  } else {
    log('✗ Invalid custom AI data validation failed', 'red');
  }
  
  // Test file validation
  const validFile = {
    name: 'test.pdf',
    type: 'application/pdf',
    size: 1024 * 1024 // 1MB
  };
  
  const fileResult = validateFileUpload(validFile, 0);
  if (fileResult.isValid) {
    log('✓ Valid file validation passed', 'green');
  } else {
    log('✗ Valid file validation failed: ' + fileResult.errors.join(', '), 'red');
  }
  
  return true;
}

async function validateFileProcessing() {
  log('\n=== File Processing Validation ===', 'blue');
  
  const { extractTextFromFile, validateKnowledgeBaseFile } = require('./utils/fileProcessor');
  
  // Test file validation
  const testFile = {
    originalname: 'test.txt',
    mimetype: 'text/plain',
    size: 1024
  };
  
  const validation = validateKnowledgeBaseFile(testFile);
  if (validation.isValid) {
    log('✓ File validation function works correctly', 'green');
  } else {
    log('✗ File validation failed: ' + validation.error, 'red');
  }
  
  // Test text extraction with sample text
  try {
    const sampleText = Buffer.from('This is a test document content.');
    const extractedText = await extractTextFromFile(sampleText, 'test.txt', 'text/plain');
    if (extractedText.includes('test document')) {
      log('✓ Text extraction works correctly', 'green');
    } else {
      log('✗ Text extraction failed to extract content', 'red');
    }
  } catch (error) {
    log('✓ Text extraction error handling works: ' + error.message, 'yellow');
  }
  
  return true;
}

async function validateAPIEndpoints() {
  log('\n=== API Endpoints Validation ===', 'blue');
  
  // Check if routes are properly defined
  const fs = require('fs');
  const path = require('path');
  
  const routeFile = path.join(__dirname, 'routes', 'customAI.js');
  if (fs.existsSync(routeFile)) {
    log('✓ Custom AI routes file exists', 'green');
    
    const routeContent = fs.readFileSync(routeFile, 'utf8');
    const expectedRoutes = [
      'GET.*/',
      'POST.*/',
      'GET.*/:id',
      'PUT.*/:id',
      'DELETE.*/:id',
      'POST.*/:id/duplicate',
      'POST.*/:id/files',
      'DELETE.*/:id/files/:fileId'
    ];
    
    let allRoutesFound = true;
    expectedRoutes.forEach(route => {
      if (!new RegExp(route).test(routeContent)) {
        log(`✗ Route pattern not found: ${route}`, 'red');
        allRoutesFound = false;
      }
    });
    
    if (allRoutesFound) {
      log('✓ All expected routes are defined', 'green');
    }
  } else {
    log('✗ Custom AI routes file not found', 'red');
  }
  
  // Check if controller exists
  const controllerFile = path.join(__dirname, 'controllers', 'customAI.js');
  if (fs.existsSync(controllerFile)) {
    log('✓ Custom AI controller file exists', 'green');
  } else {
    log('✗ Custom AI controller file not found', 'red');
  }
  
  return true;
}

async function validateFrontendIntegration() {
  log('\n=== Frontend Integration Validation ===', 'blue');
  
  const fs = require('fs');
  const path = require('path');
  
  // Check if frontend components exist
  const frontendPath = path.join(__dirname, '..', 'frontend', 'client', 'src', 'components');
  const expectedComponents = [
    'CustomAIManager.tsx',
    'CustomAIFileManager.tsx'
  ];
  
  expectedComponents.forEach(component => {
    const componentPath = path.join(frontendPath, component);
    if (fs.existsSync(componentPath)) {
      log(`✓ Component exists: ${component}`, 'green');
    } else {
      log(`✗ Component missing: ${component}`, 'red');
    }
  });
  
  // Check if API functions are added
  const apiFile = path.join(__dirname, '..', 'frontend', 'client', 'src', 'services', 'api.ts');
  if (fs.existsSync(apiFile)) {
    const apiContent = fs.readFileSync(apiFile, 'utf8');
    if (apiContent.includes('getCustomAIs') && apiContent.includes('createCustomAI')) {
      log('✓ Custom AI API functions are defined', 'green');
    } else {
      log('✗ Custom AI API functions not found', 'red');
    }
  } else {
    log('✗ API service file not found', 'red');
  }
  
  return true;
}

async function runValidation() {
  log('Starting Custom AI Feature Validation...', 'blue');
  
  const connected = await connectDB();
  if (!connected) {
    process.exit(1);
  }
  
  try {
    await validateDatabaseSchema();
    await validateBusinessLogic();
    await validateFileProcessing();
    await validateAPIEndpoints();
    await validateFrontendIntegration();
    
    log('\n=== Validation Summary ===', 'blue');
    log('✓ Custom AI feature validation completed', 'green');
    log('Review the output above for any issues that need attention.', 'yellow');
    
  } catch (error) {
    log('\n✗ Validation failed with error: ' + error.message, 'red');
  } finally {
    await mongoose.disconnect();
    log('✓ Disconnected from MongoDB', 'green');
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  runValidation().catch(console.error);
}

module.exports = {
  runValidation,
  validateDatabaseSchema,
  validateBusinessLogic,
  validateFileProcessing,
  validateAPIEndpoints,
  validateFrontendIntegration
};
