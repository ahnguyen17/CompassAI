import React, { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';

interface AIDocSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    systemPrompt: string;
    selectedModel: string;
    availableModels: Array<{ name: string; displayName: string; provider: string }>;
    onSave: (systemPrompt: string, selectedModel: string) => void;
}

const AIDocSettingsModal: React.FC<AIDocSettingsModalProps> = ({
    isOpen,
    onClose,
    systemPrompt,
    selectedModel,
    availableModels,
    onSave
}) => {
    const { isDarkMode } = useAuthStore();
    const [localSystemPrompt, setLocalSystemPrompt] = useState(systemPrompt);
    const [localSelectedModel, setLocalSelectedModel] = useState(selectedModel);

    useEffect(() => {
        setLocalSystemPrompt(systemPrompt);
        setLocalSelectedModel(selectedModel);
    }, [systemPrompt, selectedModel, isOpen]);

    const handleSave = () => {
        onSave(localSystemPrompt, localSelectedModel);
        onClose();
    };

    if (!isOpen) return null;

    const modalOverlayStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    };

    const modalContentStyle: React.CSSProperties = {
        backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff',
        color: isDarkMode ? '#e0e0e0' : '#333333',
        padding: '30px',
        borderRadius: '12px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        marginBottom: '8px',
        fontWeight: '600',
        fontSize: '14px',
    };

    const textareaStyle: React.CSSProperties = {
        width: '100%',
        minHeight: '200px',
        padding: '12px',
        borderRadius: '8px',
        border: `1px solid ${isDarkMode ? '#444' : '#ddd'}`,
        backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
        color: isDarkMode ? '#e0e0e0' : '#333333',
        fontSize: '14px',
        fontFamily: 'monospace',
        resize: 'vertical',
        marginBottom: '20px',
    };

    const selectStyle: React.CSSProperties = {
        width: '100%',
        padding: '10px',
        borderRadius: '8px',
        border: `1px solid ${isDarkMode ? '#444' : '#ddd'}`,
        backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
        color: isDarkMode ? '#e0e0e0' : '#333333',
        fontSize: '14px',
        marginBottom: '20px',
    };

    const buttonContainerStyle: React.CSSProperties = {
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end',
    };

    const buttonStyle: React.CSSProperties = {
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        transition: 'all 0.2s',
    };

    const saveButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: '#28a745',
        color: '#ffffff',
    };

    const cancelButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: isDarkMode ? '#444' : '#6c757d',
        color: '#ffffff',
    };

    return (
        <div style={modalOverlayStyle} onClick={onClose}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                <h2 style={{ marginTop: 0, marginBottom: '20px' }}>AIDoc Settings</h2>
                
                <div style={{ marginBottom: '20px' }}>
                    <label style={labelStyle}>System Prompt</label>
                    <textarea
                        value={localSystemPrompt}
                        onChange={(e) => setLocalSystemPrompt(e.target.value)}
                        style={textareaStyle}
                        placeholder="Enter the system prompt for AIDoc..."
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={labelStyle}>AI Model</label>
                    <select
                        value={localSelectedModel}
                        onChange={(e) => setLocalSelectedModel(e.target.value)}
                        style={selectStyle}
                        disabled={availableModels.length === 0}
                    >
                        {availableModels.length === 0 ? (
                            <option value="">Loading models...</option>
                        ) : (
                            availableModels.map((model) => (
                                <option key={model.name} value={model.name}>
                                    {model.displayName} ({model.provider})
                                </option>
                            ))
                        )}
                    </select>
                    {availableModels.length === 0 && (
                        <div style={{
                            fontSize: '12px',
                            color: isDarkMode ? '#999' : '#666',
                            marginTop: '5px'
                        }}>
                            ⚠️ No models available. Please configure API keys in Settings.
                        </div>
                    )}
                </div>

                <div style={buttonContainerStyle}>
                    <button
                        onClick={onClose}
                        style={cancelButtonStyle}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.8';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1';
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        style={saveButtonStyle}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.8';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1';
                        }}
                    >
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIDocSettingsModal;

