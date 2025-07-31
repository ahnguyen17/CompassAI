import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/api';
import useAuthStore from '../store/authStore';
import CustomAIFileManager from './CustomAIFileManager';

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

interface CustomAIManagerProps {
  isDarkMode: boolean;
  availableModels: any; // Will be passed from parent
}

const CustomAIManager: React.FC<CustomAIManagerProps> = ({ isDarkMode, availableModels }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();

  // State
  const [customAIs, setCustomAIs] = useState<CustomAI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAI, setEditingAI] = useState<CustomAI | null>(null);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [selectedAI, setSelectedAI] = useState<CustomAI | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    instructions: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Styles (matching SettingsPage patterns)
  const sectionStyle = {
    marginBottom: '30px',
    padding: '20px',
    border: `1px solid ${isDarkMode ? '#444' : '#ccc'}`,
    borderRadius: '8px',
    background: isDarkMode ? '#2a2a2a' : '#f9f9f9',
    color: isDarkMode ? '#e0e0e0' : 'inherit'
  };

  const h3Style = {
    marginTop: 0,
    marginBottom: '20px',
    borderBottom: `1px solid ${isDarkMode ? '#444' : '#eee'}`,
    paddingBottom: '10px',
    color: isDarkMode ? '#e0e0e0' : 'inherit'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '5px',
    fontWeight: '500' as const,
    color: isDarkMode ? '#ccc' : 'inherit'
  };

  const inputStyle = {
    padding: '10px',
    width: '100%',
    maxWidth: '400px',
    borderRadius: '4px',
    border: `1px solid ${isDarkMode ? '#555' : '#ccc'}`,
    background: isDarkMode ? '#3a3d41' : 'white',
    color: isDarkMode ? '#e0e0e0' : 'inherit',
    boxSizing: 'border-box' as const
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

  const cardStyle = {
    border: `1px solid ${isDarkMode ? '#555' : '#ddd'}`,
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '15px',
    background: isDarkMode ? '#333' : 'white',
    color: isDarkMode ? '#e0e0e0' : 'inherit'
  };

  // Fetch custom AIs
  const fetchCustomAIs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/customai');
      if (response.data?.success) {
        setCustomAIs(response.data.data);
      } else {
        setError('Failed to fetch custom AIs.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error fetching custom AIs.');
    } finally {
      setLoading(false);
    }
  };

  // Create custom AI
  const handleCreateAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const response = await apiClient.post('/customai', formData);
      if (response.data?.success) {
        setCustomAIs([response.data.data, ...customAIs]);
        setShowCreateModal(false);
        setFormData({ name: '', model: '', instructions: '' });
      } else {
        setFormError('Failed to create custom AI.');
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Error creating custom AI.');
    } finally {
      setFormLoading(false);
    }
  };

  // Update custom AI
  const handleUpdateAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAI) return;

    setFormLoading(true);
    setFormError('');

    try {
      const response = await apiClient.put(`/customai/${editingAI._id}`, formData);
      if (response.data?.success) {
        setCustomAIs(customAIs.map(ai => 
          ai._id === editingAI._id ? response.data.data : ai
        ));
        setShowEditModal(false);
        setEditingAI(null);
        setFormData({ name: '', model: '', instructions: '' });
      } else {
        setFormError('Failed to update custom AI.');
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Error updating custom AI.');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete custom AI
  const handleDeleteAI = async (aiId: string) => {
    if (!confirm('Are you sure you want to delete this custom AI? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await apiClient.delete(`/customai/${aiId}`);
      if (response.data?.success) {
        setCustomAIs(customAIs.filter(ai => ai._id !== aiId));
      } else {
        setError('Failed to delete custom AI.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error deleting custom AI.');
    }
  };

  // Duplicate custom AI
  const handleDuplicateAI = async (aiId: string) => {
    try {
      const response = await apiClient.post(`/customai/${aiId}/duplicate`);
      if (response.data?.success) {
        setCustomAIs([response.data.data, ...customAIs]);
      } else {
        setError('Failed to duplicate custom AI.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error duplicating custom AI.');
    }
  };

  // Open edit modal
  const openEditModal = (ai: CustomAI) => {
    setEditingAI(ai);
    setFormData({
      name: ai.name,
      model: ai.model,
      instructions: ai.instructions
    });
    setFormError('');
    setShowEditModal(true);
  };

  // Open files modal
  const openFilesModal = (ai: CustomAI) => {
    setSelectedAI(ai);
    setShowFilesModal(true);
  };

  // Close modals
  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowFilesModal(false);
    setEditingAI(null);
    setSelectedAI(null);
    setFormData({ name: '', model: '', instructions: '' });
    setFormError('');
    setUploadError('');
  };

  // Get available models for dropdown
  const getModelOptions = () => {
    const options: JSX.Element[] = [];
    
    // Add base models
    if (availableModels?.baseModels) {
      Object.keys(availableModels.baseModels).forEach(provider => {
        availableModels.baseModels[provider].forEach((model: any) => {
          options.push(
            <option key={model.name} value={model.name}>
              {provider}: {model.name}
            </option>
          );
        });
      });
    }
    
    // Add custom models
    if (availableModels?.customModels) {
      availableModels.customModels.forEach((model: any) => {
        options.push(
          <option key={model._id} value={model._id}>
            {model.providerName}: {model.name} (Custom)
          </option>
        );
      });
    }
    
    return options;
  };

  useEffect(() => {
    fetchCustomAIs();
  }, []);

  return (
    <div style={sectionStyle}>
      <h3 style={h3Style}>Custom AI Assistants</h3>
      
      {error && <p style={{ color: 'red', marginBottom: '15px' }}>{error}</p>}
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setShowCreateModal(true)} 
          style={buttonStyle}
        >
          Create New Custom AI
        </button>
      </div>

      {loading ? (
        <p>Loading custom AIs...</p>
      ) : customAIs.length === 0 ? (
        <p>No custom AIs created yet. Create your first one to get started!</p>
      ) : (
        <div>
          {customAIs.map(ai => (
            <div key={ai._id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>{ai.name}</h4>
                  <p style={{ margin: '5px 0', fontSize: '0.9em', opacity: 0.8 }}>
                    Model: {ai.model}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '0.9em' }}>
                    {ai.instructions.length > 100 
                      ? `${ai.instructions.substring(0, 100)}...` 
                      : ai.instructions
                    }
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '0.8em', opacity: 0.7 }}>
                    Files: {ai.knowledgeBaseFiles.length}/10 | 
                    Created: {new Date(ai.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginLeft: '15px' }}>
                  <button 
                    onClick={() => openEditModal(ai)} 
                    style={smallButtonStyle}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => openFilesModal(ai)} 
                    style={smallButtonStyle}
                  >
                    Files ({ai.knowledgeBaseFiles.length})
                  </button>
                  <button 
                    onClick={() => handleDuplicateAI(ai._id)} 
                    style={smallButtonStyle}
                  >
                    Duplicate
                  </button>
                  <button 
                    onClick={() => handleDeleteAI(ai._id)} 
                    style={deleteButtonStyle}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: isDarkMode ? '#333' : 'white', padding: '25px', borderRadius: '8px',
            width: '90%', maxWidth: '600px',
            color: isDarkMode ? '#e0e0e0' : 'inherit',
            maxHeight: '80vh', overflowY: 'auto'
          }}>
            <h4 style={{ marginTop: 0, marginBottom: '20px' }}>Create New Custom AI</h4>
            <form onSubmit={handleCreateAI}>
              {formError && <p style={{ color: 'red', marginBottom: '15px' }}>{formError}</p>}

              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="aiName" style={labelStyle}>AI Name (max 50 characters):</label>
                <input
                  id="aiName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  maxLength={50}
                  required
                  style={inputStyle}
                  placeholder="Enter a unique name for your AI assistant"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="aiModel" style={labelStyle}>AI Model:</label>
                <select
                  id="aiModel"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  required
                  style={inputStyle}
                >
                  <option value="">Select a model...</option>
                  {getModelOptions()}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="aiInstructions" style={labelStyle}>AI Instructions (max 2000 characters):</label>
                <textarea
                  id="aiInstructions"
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  maxLength={2000}
                  rows={6}
                  required
                  style={{...inputStyle, height: 'auto', maxWidth: '100%'}}
                  placeholder="Define how your AI should behave, its personality, and any specific instructions..."
                />
                <div style={{ fontSize: '0.8em', opacity: 0.7, marginTop: '5px' }}>
                  {formData.instructions.length}/2000 characters
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={closeModals}
                  style={{...smallButtonStyle, background: isDarkMode ? '#555' : '#ccc'}}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  style={formLoading ? {...buttonStyle, opacity: 0.6, cursor: 'not-allowed'} : buttonStyle}
                >
                  {formLoading ? 'Creating...' : 'Create AI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingAI && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: isDarkMode ? '#333' : 'white', padding: '25px', borderRadius: '8px',
            width: '90%', maxWidth: '600px',
            color: isDarkMode ? '#e0e0e0' : 'inherit',
            maxHeight: '80vh', overflowY: 'auto'
          }}>
            <h4 style={{ marginTop: 0, marginBottom: '20px' }}>Edit Custom AI</h4>
            <form onSubmit={handleUpdateAI}>
              {formError && <p style={{ color: 'red', marginBottom: '15px' }}>{formError}</p>}

              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="editAiName" style={labelStyle}>AI Name (max 50 characters):</label>
                <input
                  id="editAiName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  maxLength={50}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="editAiModel" style={labelStyle}>AI Model:</label>
                <select
                  id="editAiModel"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  required
                  style={inputStyle}
                >
                  <option value="">Select a model...</option>
                  {getModelOptions()}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="editAiInstructions" style={labelStyle}>AI Instructions (max 2000 characters):</label>
                <textarea
                  id="editAiInstructions"
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  maxLength={2000}
                  rows={6}
                  required
                  style={{...inputStyle, height: 'auto', maxWidth: '100%'}}
                />
                <div style={{ fontSize: '0.8em', opacity: 0.7, marginTop: '5px' }}>
                  {formData.instructions.length}/2000 characters
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={closeModals}
                  style={{...smallButtonStyle, background: isDarkMode ? '#555' : '#ccc'}}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  style={formLoading ? {...buttonStyle, opacity: 0.6, cursor: 'not-allowed'} : buttonStyle}
                >
                  {formLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Files Modal */}
      {showFilesModal && selectedAI && (
        <CustomAIFileManager
          customAI={selectedAI}
          isDarkMode={isDarkMode}
          onClose={closeModals}
          onFilesUpdated={(updatedAI) => {
            // Update the AI in the list
            setCustomAIs(customAIs.map(ai =>
              ai._id === updatedAI._id ? { ...ai, knowledgeBaseFiles: updatedAI.knowledgeBaseFiles } : ai
            ));
            // Update the selected AI for the modal
            setSelectedAI(updatedAI);
          }}
        />
      )}
    </div>
  );
};

export default CustomAIManager;
