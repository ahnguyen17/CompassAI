const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

/**
 * Web Content Extraction Service
 * Fetches and extracts text content from web pages
 */
class WebContentExtractor {
  constructor() {
    this.timeout = 30000; // 30 seconds timeout
    this.maxContentLength = 1000000; // 1MB max content
    this.userAgent = 'CompassAI-Bot/1.0 (+https://compassai.com)';
  }

  /**
   * Validate URL format and accessibility
   * @param {string} url - The URL to validate
   * @returns {Object} - Validation result with isValid and error
   */
  validateUrl(url) {
    try {
      const parsedUrl = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return {
          isValid: false,
          error: 'Only HTTP and HTTPS URLs are supported'
        };
      }

      // Check for localhost/private IPs (security measure)
      const hostname = parsedUrl.hostname.toLowerCase();
      if (hostname === 'localhost' || 
          hostname === '127.0.0.1' || 
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('172.')) {
        return {
          isValid: false,
          error: 'Private/local URLs are not allowed for security reasons'
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid URL format'
      };
    }
  }

  /**
   * Fetch content from URL with proper headers and error handling
   * @param {string} url - The URL to fetch
   * @returns {Object} - Response with content, contentType, and metadata
   */
  async fetchContent(url) {
    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        maxContentLength: this.maxContentLength,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        validateStatus: (status) => status < 400, // Accept only successful responses
      });

      return {
        success: true,
        content: response.data,
        contentType: response.headers['content-type'] || 'text/html',
        contentLength: response.data.length,
        statusCode: response.status
      };
    } catch (error) {
      let errorMessage = 'Failed to fetch URL content';
      
      if (error.code === 'ENOTFOUND') {
        errorMessage = 'URL not found or domain does not exist';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused by server';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Request timed out';
      } else if (error.response) {
        errorMessage = `Server responded with status ${error.response.status}`;
      }

      return {
        success: false,
        error: errorMessage,
        statusCode: error.response?.status || 0
      };
    }
  }

  /**
   * Extract text content from HTML using cheerio
   * @param {string} html - The HTML content
   * @param {string} url - The original URL (for context)
   * @returns {Object} - Extracted text and metadata
   */
  extractTextFromHtml(html, url) {
    try {
      const $ = cheerio.load(html);
      
      // Remove script and style elements
      $('script, style, nav, footer, aside, .advertisement, .ads, .sidebar').remove();
      
      // Extract title
      const title = $('title').text().trim() || 
                   $('h1').first().text().trim() || 
                   'Untitled Page';
      
      // Extract main content
      let content = '';
      
      // Try to find main content areas
      const contentSelectors = [
        'main',
        'article',
        '.content',
        '.main-content',
        '.post-content',
        '.entry-content',
        '#content',
        '#main'
      ];
      
      let mainContent = null;
      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0 && element.text().trim().length > 100) {
          mainContent = element;
          break;
        }
      }
      
      // If no main content found, use body
      if (!mainContent) {
        mainContent = $('body');
      }
      
      // Extract text from paragraphs, headings, and lists
      mainContent.find('p, h1, h2, h3, h4, h5, h6, li, blockquote, div').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text.length > 10) { // Only include substantial text
          content += text + '\n\n';
        }
      });
      
      // Clean up the content
      content = content
        .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
        .replace(/\s{2,}/g, ' ') // Remove excessive spaces
        .trim();
      
      return {
        success: true,
        title: title.substring(0, 500), // Limit title length
        extractedText: content.substring(0, 50000), // Limit content length
        contentLength: content.length
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse HTML content',
        title: '',
        extractedText: '',
        contentLength: 0
      };
    }
  }

  /**
   * Process a URL: validate, fetch, and extract content
   * @param {string} url - The URL to process
   * @returns {Object} - Complete processing result
   */
  async processUrl(url) {
    // Step 1: Validate URL
    const validation = this.validateUrl(url);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
        title: '',
        extractedText: '',
        contentType: '',
        contentLength: 0
      };
    }

    // Step 2: Fetch content
    const fetchResult = await this.fetchContent(url);
    if (!fetchResult.success) {
      return {
        success: false,
        error: fetchResult.error,
        title: '',
        extractedText: '',
        contentType: '',
        contentLength: 0
      };
    }

    // Step 3: Extract text (only for HTML content)
    if (fetchResult.contentType.includes('text/html')) {
      const extractResult = this.extractTextFromHtml(fetchResult.content, url);
      
      return {
        success: extractResult.success,
        error: extractResult.error || null,
        title: extractResult.title,
        extractedText: extractResult.extractedText,
        contentType: fetchResult.contentType,
        contentLength: extractResult.contentLength
      };
    } else {
      // For non-HTML content, try to extract as plain text
      const content = fetchResult.content.toString().substring(0, 50000);
      return {
        success: true,
        error: null,
        title: url.split('/').pop() || 'Document',
        extractedText: content,
        contentType: fetchResult.contentType,
        contentLength: content.length
      };
    }
  }
}

module.exports = new WebContentExtractor();
