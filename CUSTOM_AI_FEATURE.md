# Custom AI Feature Documentation

## Overview

The Custom AI feature allows users to create personalized AI assistants with custom instructions and knowledge bases. Users can upload documents to create a knowledge base and define specific behaviors for their AI assistants.

## Features

### Core Functionality
- **Custom AI Creation**: Users can create multiple personalized AI assistants
- **Knowledge Base**: Upload files and add web URLs per custom AI to create a knowledge base (limit configurable by admin)
- **Custom Instructions**: Define AI behavior and personality with up to 2000 characters
- **Model Selection**: Choose from available AI models for each custom AI
- **Chat Integration**: Use custom AIs directly in chat conversations
- **Admin Controls**: Administrators can restrict which models are available for custom AI creation

### Supported Knowledge Sources

#### File Types
- **Documents**: PDF, DOC, DOCX, TXT, MD
- **Spreadsheets**: XLS, XLSX
- **Images**: PNG, JPG, JPEG (placeholder for future OCR integration)

#### Web URLs
- **HTTP/HTTPS URLs**: Any publicly accessible web page
- **Automatic Content Extraction**: Text content extracted from HTML pages
- **Security**: Private/local URLs blocked for security

### Knowledge Source Limits
- Configurable maximum sources per custom AI (admin setting, default: 20)
- Combined limit applies to files AND URLs together
- Maximum 10MB per file
- Automatic text extraction and processing for both files and web content

## Architecture

### Backend Components

#### Models
- **CustomAI** (`backend/models/CustomAI.js`): Main model for custom AI data
- **KnowledgeBaseFile**: Subdocument for file metadata and extracted text

#### Controllers
- **customAI.js** (`backend/controllers/customAI.js`): CRUD operations and file management

#### Routes
- **customAI.js** (`backend/routes/customAI.js`): API endpoints for custom AI operations

#### Utilities
- **fileProcessor.js** (`backend/utils/fileProcessor.js`): File validation and text extraction

### Frontend Components

#### React Components
- **CustomAIManager** (`frontend/client/src/components/CustomAIManager.tsx`): Main management interface
- **CustomAIFileManager** (`frontend/client/src/components/CustomAIFileManager.tsx`): File upload and management
- **ModelSelectorDropdown**: Updated to include custom AIs

#### Integration
- **SettingsPage**: Custom AI management section
- **ChatPage**: Custom AI selection and usage
- **API Services**: Custom AI API functions

## API Endpoints

### Custom AI Management
```
GET    /api/v1/customai              # List user's custom AIs
POST   /api/v1/customai              # Create new custom AI
GET    /api/v1/customai/:id          # Get specific custom AI
PUT    /api/v1/customai/:id          # Update custom AI
DELETE /api/v1/customai/:id          # Delete custom AI (soft delete)
POST   /api/v1/customai/:id/duplicate # Duplicate custom AI
```

### Knowledge Base Management
```
POST   /api/v1/customai/:id/files           # Upload knowledge base file
DELETE /api/v1/customai/:id/files/:fileId   # Delete knowledge base file
POST   /api/v1/customai/:id/urls            # Add knowledge base URL
DELETE /api/v1/customai/:id/urls/:urlId     # Delete knowledge base URL
```

### Chat Integration
```
GET    /api/v1/customai/:id/chat-context    # Get custom AI context for chat
```

### Admin Controls
```
GET    /api/v1/customai/allowed-models      # Get allowed models for custom AI creation
GET    /api/v1/customai/knowledge-limits    # Get knowledge source limits
PUT    /api/v1/settings                     # Update global settings (including allowedCustomAIModels, maxKnowledgeSourcesPerAI)
```

## Database Schema

### Setting Collection (Updated)
```javascript
{
  key: String,                    // 'globalSettings'
  globalStreamingEnabled: Boolean, // Existing setting
  allowedCustomAIModels: [String], // Array of allowed model IDs
  maxKnowledgeSourcesPerAI: Number, // NEW: Maximum files per custom AI (0-100, default: 20)
  lastUpdatedAt: Date
}
```

### CustomAI Collection
```javascript
{
  userId: ObjectId,           // Reference to User
  name: String,              // AI name (max 50 chars, unique per user)
  model: String,             // Selected AI model
  instructions: String,      // Custom instructions (max 2000 chars)
  knowledgeBaseFiles: [{     // Array of uploaded files
    originalName: String,
    fileName: String,        // S3 key
    filePath: String,        // S3 URL
    fileType: String,        // File extension
    fileSize: Number,
    extractedText: String,   // Processed text content
    processingStatus: String, // pending|processing|completed|failed
    processingError: String,
    createdAt: Date,
    updatedAt: Date
  }],
  knowledgeBaseUrls: [{      // Array of web URLs
    originalUrl: String,     // Original URL
    title: String,           // Extracted page title
    contentType: String,     // MIME type
    extractedText: String,   // Processed text content
    processingStatus: String, // pending|processing|completed|failed
    processingError: String,
    fetchTimestamp: Date,    // When content was fetched
    contentLength: Number,   // Length of extracted content
    createdAt: Date,
    updatedAt: Date
  }],
  isActive: Boolean,         // Soft delete flag
  createdAt: Date,
  updatedAt: Date
}
```

## Usage Guide

### Creating a Custom AI

1. **Navigate to Settings**: Go to Settings > Custom AI section
2. **Create New AI**: Click "Create New Custom AI"
3. **Fill Details**:
   - Enter a unique name (max 50 characters)
   - Select an AI model
   - Write custom instructions (max 2000 characters)
4. **Save**: Click "Create AI"

### Adding Knowledge Base Sources

#### Files
1. **Open Knowledge Sources Manager**: Click "Sources" button on a custom AI
2. **Select Files Tab**: Click on the "📁 Files" tab
3. **Upload Files**: Drag and drop or click to browse files (limit set by admin)
4. **Monitor Processing**: Wait for files to process and extract text
5. **Manage Files**: View, delete files as needed

#### Web URLs
1. **Open Knowledge Sources Manager**: Click "Sources" button on a custom AI
2. **Select URLs Tab**: Click on the "🌐 URLs" tab
3. **Add URL**: Enter a web page URL and click "Add URL"
4. **Monitor Processing**: Wait for content to be extracted from the web page
5. **Manage URLs**: View extracted content, delete URLs as needed

#### Combined Limits
- The admin-configured limit applies to the **total** of files AND URLs combined
- Example: If limit is 20, you could have 15 files + 5 URLs, or 10 files + 10 URLs, etc.

### Using Custom AI in Chat

1. **Select Custom AI**: Use the model selector dropdown in chat
2. **Visual Indicators**: Look for 🤖 Custom AI indicators
3. **Chat Normally**: The AI will use your custom instructions and knowledge base

### Admin Controls (Admin Users Only)

#### Restricting Available Models
1. **Navigate to Settings**: Go to Settings > Global Settings (admin only)
2. **Configure Restrictions**: Click "Configure" in the Custom AI Model Restrictions section
3. **Select Models**: Check/uncheck models that users can use for custom AIs
4. **Save Changes**: Click "Save Restrictions" to apply the settings

#### Setting Knowledge Source Limits
1. **Navigate to Settings**: Go to Settings > Global Settings (admin only)
2. **Configure Limits**: Click "Configure" in the Knowledge Source Limits section
3. **Set Limit**: Enter the maximum number of files (0-100) per custom AI
4. **Save Changes**: Click "Save Limit" to apply the setting

#### How Admin Controls Work
- **Model Restrictions**:
  - Empty List: All models are available to users (default behavior)
  - Selected Models: Only checked models can be used for custom AI creation
  - User Experience: Users see a warning when restrictions are active
  - Existing Custom AIs: Restrictions don't affect already created custom AIs

- **Knowledge Source Limits**:
  - Default: 20 files per custom AI
  - Range: 0-100 files per custom AI
  - Real-time: Changes apply immediately to new file uploads
  - Existing Files: Already uploaded files are not affected

## Security Features

- **User Isolation**: Users can only access their own custom AIs
- **File Validation**: Strict file type and size validation
- **Input Sanitization**: Protection against XSS and injection attacks
- **Authentication**: All endpoints require valid authentication
- **Soft Delete**: Custom AIs are soft-deleted for data recovery

## Performance Considerations

- **File Processing**: Asynchronous text extraction
- **S3 Storage**: Efficient file storage and retrieval
- **Context Optimization**: Smart knowledge base text formatting
- **Caching**: Consider implementing caching for frequently used custom AIs

## Testing

### Validation Script
Run the validation script to test basic functionality:
```bash
cd backend
node validate-custom-ai.js
```

### Manual Testing
See `backend/tests/customAI.test.js` for comprehensive test scenarios.

### Test Coverage
- Database schema validation
- API endpoint testing
- File processing validation
- User interface testing
- Security testing
- Performance testing

## Deployment Notes

### Dependencies
Install required packages for URL processing:
```bash
cd backend
npm install axios cheerio
```

### Environment Variables
Ensure these are set:
- `AWS_S3_BUCKET_NAME`: S3 bucket for file storage
- `AWS_S3_REGION`: S3 region
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key

### Database Migration
The CustomAI model will be created automatically when first used.

### File Storage
Files are stored in S3 with the following structure:
```
custom-ai/
  ├── {customAI_id}/
  │   ├── {uuid}.pdf
  │   ├── {uuid}.docx
  │   └── ...
```

## Future Enhancements

- **OCR Integration**: Extract text from images
- **Advanced File Types**: Support for more document formats
- **Knowledge Base Search**: Semantic search within knowledge bases
- **AI Training**: Fine-tuning capabilities
- **Collaboration**: Share custom AIs between users
- **Analytics**: Usage statistics and performance metrics
- **Version Control**: Track changes to custom AIs
- **Templates**: Pre-built custom AI templates

## Troubleshooting

### Common Issues

1. **File Upload Fails**
   - Check file size (max 10MB)
   - Verify file type is supported
   - Ensure S3 credentials are correct

2. **Text Extraction Fails**
   - File may be corrupted
   - Unsupported file format variant
   - Check processing error message

3. **Custom AI Not Appearing in Chat**
   - Refresh the page
   - Check if custom AI is active
   - Verify user permissions

4. **Performance Issues**
   - Large knowledge bases may slow responses
   - Consider reducing file count or size
   - Monitor server resources

### Support
For issues or questions, check the application logs and validation script output for detailed error information.
