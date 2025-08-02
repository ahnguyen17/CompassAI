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

interface CustomAI {
  _id: string;
  userId: string;
  name: string;
  model: string;
  instructions: string;
  knowledgeBaseFiles: KnowledgeBaseFile[];
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

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (customAI.knowledgeBaseFiles.length >= maxKnowledgeSources) {
      setUploadError(`Maximum of ${maxKnowledgeSources} files allowed per custom AI.`);
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
          <h4 style={{ margin: 0 }}>Knowledge Base Files - {customAI.name}</h4>
          <button onClick={onClose} style={smallButtonStyle}>✕</button>
        </div>

        {uploadError && <p style={{ color: 'red', marginBottom: '15px' }}>{uploadError}</p>}

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
                Max {loadingLimits ? '...' : maxKnowledgeSources} files, 10MB per file
              </p>
            </>
          )}
        </div>

        {/* Files List */}
        <div>
          <h5 style={{ marginBottom: '15px' }}>
            Uploaded Files ({customAI.knowledgeBaseFiles.length}/{loadingLimits ? '...' : maxKnowledgeSources})
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
