import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/api';

// Interfaces
interface KnowledgeBaseFile {
  _id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  extractedText: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingError: string;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeBaseUrl {
  _id: string;
  originalUrl: string;
  title: string;
  contentType: string;
  extractedText: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingError: string;
  fetchTimestamp: string;
  contentLength: number;
  createdAt: string;
  updatedAt: string;
}

interface CustomAI {
  _id: string;
  userId: string;
  name: string;
  model: string;
  instructions: string;
  knowledgeBaseFiles: KnowledgeBaseFile[];
  knowledgeBaseUrls?: KnowledgeBaseUrl[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CustomAIFileManagerProps {
  customAI: CustomAI;
  isDarkMode: boolean;
  onClose: () => void;
  onFilesUpdated: (updatedAI: CustomAI) => void;
}

const CustomAIFileManager: React.FC<CustomAIFileManagerProps> = ({ 
  customAI, 
  isDarkMode, 
  onClose, 
  onFilesUpdated 
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [maxKnowledgeSources, setMaxKnowledgeSources] = useState(20); // Default to 20
  const [loadingLimits, setLoadingLimits] = useState(true);

  // URL-specific state
  const [urlInput, setUrlInput] = useState('');
  const [urlUploading, setUrlUploading] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [activeTab, setActiveTab] = useState<'files' | 'urls'>('files');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Fetch knowledge source limits on component mount
  useEffect(() => {
    const fetchKnowledgeLimits = async () => {
      try {
        const response = await apiClient.get('/customai/knowledge-limits');
        if (response.data?.success) {
          setMaxKnowledgeSources(response.data.data.maxKnowledgeSourcesPerAI);
        }
      } catch (err) {
        console.error('Error fetching knowledge limits:', err);
        // Keep default value of 20
      } finally {
        setLoadingLimits(false);
      }
    };

    fetchKnowledgeLimits();
  }, []);

  // Start polling if there are pending URLs
  useEffect(() => {
    if (hasPendingUrls()) {
      startPolling();
    } else {
      stopPolling();
    }

    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, [customAI.knowledgeBaseUrls]);

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // Styles
  const modalStyle = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  };

  const modalContentStyle = {
    background: isDarkMode ? '#333' : 'white',
    padding: '25px',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '80vh',
    overflowY: 'auto' as const,
    color: isDarkMode ? '#e0e0e0' : 'inherit'
  };

  const buttonStyle = {
    padding: '10px 20px',
    cursor: 'pointer',
    background: isDarkMode ? '#0d6efd' : '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px'
  };

  const smallButtonStyle = {
    padding: '6px 10px',
    fontSize: '0.9em',
    cursor: 'pointer',
    background: isDarkMode ? '#3a3d41' : '#f8f9fa',
    border: `1px solid ${isDarkMode ? '#555' : '#dee2e6'}`,
    color: isDarkMode ? '#e0e0e0' : 'inherit',
    borderRadius: '4px'
  };

  const deleteButtonStyle = {
    ...smallButtonStyle,
    color: 'white',
    background: isDarkMode ? '#c82333' : '#dc3545',
    border: 'none'
  };

  const fileCardStyle = {
    border: `1px solid ${isDarkMode ? '#555' : '#ddd'}`,
    borderRadius: '6px',
    padding: '15px',
    marginBottom: '10px',
    background: isDarkMode ? '#2a2a2a' : '#f9f9f9'
  };

  const uploadAreaStyle = {
    border: `2px dashed ${isDarkMode ? '#555' : '#ccc'}`,
    borderRadius: '8px',
    padding: '30px',
    textAlign: 'center' as const,
    marginBottom: '20px',
    background: isDarkMode ? '#2a2a2a' : '#f9f9f9',
    cursor: 'pointer',
    transition: 'border-color 0.3s ease'
  };

  // Get total knowledge sources count
  const getTotalSourcesCount = () => {
    return customAI.knowledgeBaseFiles.length + (customAI.knowledgeBaseUrls || []).length;
  };

  // Check if there are any pending/processing URLs
  const hasPendingUrls = () => {
    return (customAI.knowledgeBaseUrls || []).some(url =>
      url.processingStatus === 'pending' || url.processingStatus === 'processing'
    );
  };

  // Fetch updated custom AI data
  const refreshCustomAI = async () => {
    try {
      const response = await apiClient.get(`/customai/${customAI._id}`);
      if (response.data?.success) {
        onFilesUpdated(response.data.data);
        setLastRefresh(new Date());
      }
    } catch (err) {
      console.error('Error refreshing custom AI data:', err);
    }
  };

  // Start polling for URL processing updates
  const startPolling = () => {
    if (pollingInterval) return; // Already polling

    const interval = setInterval(() => {
      if (hasPendingUrls()) {
        refreshCustomAI();
      } else {
        stopPolling();
      }
    }, 3000); // Poll every 3 seconds

    setPollingInterval(interval);
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (getTotalSourcesCount() >= maxKnowledgeSources) {
      setUploadError(`Maximum of ${maxKnowledgeSources} knowledge sources (files + URLs) allowed per custom AI.`);
      return;
    }

    setUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post(`/customai/${customAI._id}/files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.success) {
        // Update the custom AI with the new file
        const updatedAI = {
          ...customAI,
          knowledgeBaseFiles: [...customAI.knowledgeBaseFiles, response.data.data]
        };
        onFilesUpdated(updatedAI);
      } else {
        setUploadError('Failed to upload file.');
      }
    } catch (err: any) {
      setUploadError(err.response?.data?.error || 'Error uploading file.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle URL upload
  const handleUrlUpload = async () => {
    if (!urlInput.trim()) {
      setUrlError('Please enter a valid URL.');
      return;
    }

    if (getTotalSourcesCount() >= maxKnowledgeSources) {
      setUrlError(`Maximum of ${maxKnowledgeSources} knowledge sources (files + URLs) allowed per custom AI.`);
      return;
    }

    setUrlUploading(true);
    setUrlError('');

    try {
      const response = await apiClient.post(`/customai/${customAI._id}/urls`, {
        url: urlInput.trim()
      });

      if (response.data?.success) {
        // Update the custom AI with the new URL
        const updatedAI = {
          ...customAI,
          knowledgeBaseUrls: [...(customAI.knowledgeBaseUrls || []), response.data.data]
        };
        onFilesUpdated(updatedAI);
        setUrlInput('');

        // Start polling since we just added a URL that needs processing
        startPolling();
      } else {
        setUrlError('Failed to add URL to knowledge base.');
      }
    } catch (err: any) {
      setUrlError(err.response?.data?.error || 'Error adding URL to knowledge base.');
    } finally {
      setUrlUploading(false);
    }
  };

  // Handle URL deletion
  const handleUrlDelete = async (urlId: string) => {
    setDeleting(urlId);
    try {
      const response = await apiClient.delete(`/customai/${customAI._id}/urls/${urlId}`);

      if (response.data?.success) {
        // Update the custom AI by removing the URL
        const updatedAI = {
          ...customAI,
          knowledgeBaseUrls: (customAI.knowledgeBaseUrls || []).filter(url => url._id !== urlId)
        };
        onFilesUpdated(updatedAI);
      }
    } catch (err: any) {
      console.error('Error deleting URL:', err);
    } finally {
      setDeleting(null);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Delete file
  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    setDeleting(fileId);

    try {
      const response = await apiClient.delete(`/customai/${customAI._id}/files/${fileId}`);
      if (response.data?.success) {
        // Update the custom AI by removing the file
        const updatedAI = {
          ...customAI,
          knowledgeBaseFiles: customAI.knowledgeBaseFiles.filter(file => file._id !== fileId)
        };
        onFilesUpdated(updatedAI);
      } else {
        setUploadError('Failed to delete file.');
      }
    } catch (err: any) {
      setUploadError(err.response?.data?.error || 'Error deleting file.');
    } finally {
      setDeleting(null);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format URL for display
  const formatUrlForDisplay = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  // Get URL domain
  const getUrlDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'failed': return '#dc3545';
      case 'processing': return '#ffc107';
      case 'pending': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const supportedTypes = 'PDF, DOC, DOCX, TXT, MD, XLS, XLSX, PNG, JPG, JPEG';

  return (
    <div style={modalStyle}>
      <div style={modalContentStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h4 style={{ margin: 0 }}>Knowledge Base - {customAI.name}</h4>
          <button onClick={onClose} style={smallButtonStyle}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', marginBottom: '20px', borderBottom: `1px solid ${isDarkMode ? '#444' : '#ddd'}` }}>
          <button
            onClick={() => setActiveTab('files')}
            style={{
              ...smallButtonStyle,
              borderRadius: '0',
              borderBottom: activeTab === 'files' ? `2px solid ${isDarkMode ? '#4CAF50' : '#007bff'}` : 'none',
              background: 'transparent',
              color: activeTab === 'files' ? (isDarkMode ? '#4CAF50' : '#007bff') : 'inherit'
            }}
          >
            📁 Files ({customAI.knowledgeBaseFiles.length})
          </button>
          <button
            onClick={() => setActiveTab('urls')}
            style={{
              ...smallButtonStyle,
              borderRadius: '0',
              borderBottom: activeTab === 'urls' ? `2px solid ${isDarkMode ? '#4CAF50' : '#007bff'}` : 'none',
              background: 'transparent',
              color: activeTab === 'urls' ? (isDarkMode ? '#4CAF50' : '#007bff') : 'inherit'
            }}
          >
            🌐 URLs ({(customAI.knowledgeBaseUrls || []).length})
            {hasPendingUrls() && <span style={{ marginLeft: '5px', fontSize: '0.8em', opacity: 0.7 }}>⏳</span>}
          </button>
        </div>

        {/* Error Messages */}
        {uploadError && <p style={{ color: 'red', marginBottom: '15px' }}>{uploadError}</p>}
        {urlError && <p style={{ color: 'red', marginBottom: '15px' }}>{urlError}</p>}

        {/* Files Tab Content */}
        {activeTab === 'files' && (
          <>
            {/* Upload Area */}
            <div
              style={uploadAreaStyle}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.txt,.md,.xls,.xlsx,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
          />
          {uploading ? (
            <p>Uploading file...</p>
          ) : (
            <>
              <p style={{ margin: '0 0 10px 0', fontSize: '1.1em' }}>
                Drop files here or click to browse
              </p>
              <p style={{ margin: 0, fontSize: '0.9em', opacity: 0.7 }}>
                Supported: {supportedTypes}
              </p>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.8em', opacity: 0.6 }}>
                Max {loadingLimits ? '...' : maxKnowledgeSources} total sources (files + URLs), 10MB per file
              </p>
            </>
          )}
        </div>

        {/* Files List */}
        <div>
          <h5 style={{ marginBottom: '15px' }}>
            Uploaded Files ({customAI.knowledgeBaseFiles.length} of {loadingLimits ? '...' : maxKnowledgeSources} total sources)
          </h5>
          
          {customAI.knowledgeBaseFiles.length === 0 ? (
            <p style={{ fontStyle: 'italic', opacity: 0.7 }}>
              No files uploaded yet. Upload files to create a knowledge base for your AI.
            </p>
          ) : (
            customAI.knowledgeBaseFiles.map(file => (
              <div key={file._id} style={fileCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h6 style={{ margin: '0 0 5px 0' }}>{file.originalName}</h6>
                    <p style={{ margin: '2px 0', fontSize: '0.8em', opacity: 0.8 }}>
                      Type: {file.fileType.toUpperCase()} | Size: {formatFileSize(file.fileSize)}
                    </p>
                    <p style={{ 
                      margin: '2px 0', 
                      fontSize: '0.8em', 
                      color: getStatusColor(file.processingStatus) 
                    }}>
                      Status: {file.processingStatus.charAt(0).toUpperCase() + file.processingStatus.slice(1)}
                    </p>
                    {file.processingStatus === 'failed' && file.processingError && (
                      <p style={{ margin: '2px 0', fontSize: '0.8em', color: '#dc3545' }}>
                        Error: {file.processingError}
                      </p>
                    )}
                    {file.processingStatus === 'completed' && (
                      <p style={{ margin: '2px 0', fontSize: '0.8em', opacity: 0.7 }}>
                        Text extracted: {file.extractedText.length} characters
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteFile(file._id)}
                    disabled={deleting === file._id}
                    style={deleting === file._id ? 
                      {...deleteButtonStyle, opacity: 0.6, cursor: 'not-allowed'} : 
                      deleteButtonStyle
                    }
                  >
                    {deleting === file._id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
          </>
        )}

        {/* URLs Tab Content */}
        {activeTab === 'urls' && (
          <>
            {/* URL Input Area */}
            <div style={{
              ...uploadAreaStyle,
              cursor: 'default'
            }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Enter a web page URL (e.g., https://example.com/article)"
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: `1px solid ${isDarkMode ? '#555' : '#ddd'}`,
                    borderRadius: '4px',
                    background: isDarkMode ? '#2a2a2a' : '#fff',
                    color: isDarkMode ? '#fff' : '#000'
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleUrlUpload();
                    }
                  }}
                />
                <button
                  onClick={handleUrlUpload}
                  disabled={urlUploading || !urlInput.trim()}
                  style={{
                    ...buttonStyle,
                    opacity: (urlUploading || !urlInput.trim()) ? 0.6 : 1,
                    cursor: (urlUploading || !urlInput.trim()) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {urlUploading ? 'Adding...' : 'Add URL'}
                </button>
              </div>
              <p style={{ margin: 0, fontSize: '0.9em', opacity: 0.7 }}>
                Add web pages as knowledge sources. The content will be extracted automatically.
              </p>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.8em', opacity: 0.6 }}>
                Max {loadingLimits ? '...' : maxKnowledgeSources} total sources (files + URLs), supports HTTP/HTTPS
              </p>
            </div>

            {/* URLs List */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h5 style={{ margin: 0 }}>
                  Added URLs ({(customAI.knowledgeBaseUrls || []).length}/{loadingLimits ? '...' : maxKnowledgeSources})
                  {hasPendingUrls() && (
                    <span style={{ marginLeft: '10px', fontSize: '0.8em', opacity: 0.7 }}>
                      ⏳ Processing content...
                    </span>
                  )}
                  {lastRefresh && (
                    <span style={{ marginLeft: '10px', fontSize: '0.7em', opacity: 0.5 }}>
                      Last updated: {lastRefresh.toLocaleTimeString()}
                    </span>
                  )}
                </h5>
                {(customAI.knowledgeBaseUrls || []).length > 0 && (
                  <button
                    onClick={refreshCustomAI}
                    style={{
                      ...smallButtonStyle,
                      fontSize: '0.8em',
                      padding: '4px 8px'
                    }}
                    title="Refresh status"
                  >
                    🔄
                  </button>
                )}
              </div>

              {(customAI.knowledgeBaseUrls || []).length === 0 ? (
                <p style={{ fontStyle: 'italic', opacity: 0.7 }}>
                  No URLs added yet. Add web page URLs to include their content in your AI's knowledge base.
                </p>
              ) : (
                (customAI.knowledgeBaseUrls || []).map(url => (
                  <div key={url._id} style={fileCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <h6 style={{ margin: '0 0 5px 0' }}>
                          🌐 {url.title || formatUrlForDisplay(url.originalUrl)}
                        </h6>
                        <p style={{ margin: '2px 0', fontSize: '0.8em', opacity: 0.8 }}>
                          Domain: {getUrlDomain(url.originalUrl)} |
                          Content: {url.contentLength > 0 ? `${url.contentLength} chars` : 'Pending'}
                        </p>
                        <p style={{
                          margin: '2px 0',
                          fontSize: '0.8em',
                          color: getStatusColor(url.processingStatus)
                        }}>
                          Status: {url.processingStatus.charAt(0).toUpperCase() + url.processingStatus.slice(1)}
                          {url.processingError && ` - ${url.processingError}`}
                        </p>
                        <p style={{ margin: '2px 0', fontSize: '0.7em', opacity: 0.6 }}>
                          {formatUrlForDisplay(url.originalUrl, 80)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleUrlDelete(url._id)}
                        disabled={deleting === url._id}
                        style={
                          deleting === url._id ?
                          {...deleteButtonStyle, opacity: 0.6, cursor: 'not-allowed'} :
                          deleteButtonStyle
                        }
                      >
                        {deleting === url._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={onClose} style={buttonStyle}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomAIFileManager;
