const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const WordExtractor = require('word-extractor');
const xlsx = require('xlsx');
const path = require('path');

/**
 * Extract text content from various file types
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} originalName - Original filename
 * @param {string} mimeType - File MIME type
 * @returns {Promise<string>} - Extracted text content
 */
const extractTextFromFile = async (fileBuffer, originalName, mimeType) => {
  try {
    const fileExtension = path.extname(originalName).toLowerCase();
    
    // Handle different file types
    switch (fileExtension) {
      case '.pdf':
        return await extractFromPDF(fileBuffer);
      
      case '.docx':
        return await extractFromDOCX(fileBuffer);
      
      case '.doc':
        return await extractFromDOC(fileBuffer);
      
      case '.txt':
      case '.md':
        return extractFromText(fileBuffer);
      
      case '.xls':
      case '.xlsx':
        return await extractFromExcel(fileBuffer);
      
      case '.png':
      case '.jpg':
      case '.jpeg':
        // For images, we'll return a placeholder for now
        // In the future, this could be enhanced with OCR
        return `[Image file: ${originalName}]`;
      
      default:
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  } catch (error) {
    console.error(`Error extracting text from ${originalName}:`, error);
    throw new Error(`Failed to extract text from ${originalName}: ${error.message}`);
  }
};

/**
 * Extract text from PDF files
 */
const extractFromPDF = async (fileBuffer) => {
  try {
    const data = await pdf(fileBuffer);
    return data.text.trim();
  } catch (error) {
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
};

/**
 * Extract text from DOCX files
 */
const extractFromDOCX = async (fileBuffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value.trim();
  } catch (error) {
    throw new Error(`DOCX extraction failed: ${error.message}`);
  }
};

/**
 * Extract text from DOC files
 */
const extractFromDOC = async (fileBuffer) => {
  try {
    const extractor = new WordExtractor();
    const extracted = await extractor.extract(fileBuffer);
    return extracted.getBody().trim();
  } catch (error) {
    throw new Error(`DOC extraction failed: ${error.message}`);
  }
};

/**
 * Extract text from plain text files
 */
const extractFromText = (fileBuffer) => {
  try {
    return fileBuffer.toString('utf-8').trim();
  } catch (error) {
    throw new Error(`Text extraction failed: ${error.message}`);
  }
};

/**
 * Extract text from Excel files
 */
const extractFromExcel = async (fileBuffer) => {
  try {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    let allText = '';
    
    // Process all sheets
    workbook.SheetNames.forEach((sheetName, index) => {
      const worksheet = workbook.Sheets[sheetName];
      const sheetData = xlsx.utils.sheet_to_csv(worksheet);
      
      if (sheetData.trim()) {
        if (index > 0) allText += '\n\n';
        allText += `--- Sheet: ${sheetName} ---\n${sheetData}`;
      }
    });
    
    return allText.trim();
  } catch (error) {
    throw new Error(`Excel extraction failed: ${error.message}`);
  }
};

/**
 * Validate file type and size for knowledge base uploads
 * @param {Object} file - Multer file object
 * @param {number} maxSizeBytes - Maximum file size in bytes
 * @returns {Object} - Validation result
 */
const validateKnowledgeBaseFile = (file, maxSizeBytes = 10 * 1024 * 1024) => { // 10MB default
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.md', '.xls', '.xlsx', '.png', '.jpg', '.jpeg'];
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/jpg'
  ];
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  // Check file extension
  if (!allowedExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: `File type ${fileExtension} is not supported. Allowed types: ${allowedExtensions.join(', ')}`
    };
  }
  
  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return {
      isValid: false,
      error: `MIME type ${file.mimetype} is not supported.`
    };
  }
  
  // Check file size
  if (file.size > maxSizeBytes) {
    const maxSizeMB = maxSizeBytes / (1024 * 1024);
    return {
      isValid: false,
      error: `File size ${(file.size / (1024 * 1024)).toFixed(2)}MB exceeds maximum allowed size of ${maxSizeMB}MB.`
    };
  }
  
  return { isValid: true };
};

/**
 * Get file type from extension
 */
const getFileTypeFromExtension = (filename) => {
  const extension = path.extname(filename).toLowerCase();
  const typeMap = {
    '.pdf': 'pdf',
    '.doc': 'doc',
    '.docx': 'docx',
    '.txt': 'txt',
    '.md': 'md',
    '.xls': 'xls',
    '.xlsx': 'xlsx',
    '.png': 'png',
    '.jpg': 'jpg',
    '.jpeg': 'jpeg'
  };
  
  return typeMap[extension] || 'unknown';
};

module.exports = {
  extractTextFromFile,
  validateKnowledgeBaseFile,
  getFileTypeFromExtension
};
