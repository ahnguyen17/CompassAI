import React, { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import { VoiceSettings } from '../hooks/useVoiceInteraction';

interface AIDocSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    systemPrompt: string;
    selectedModel: string;
    availableModels: Array<{ name: string; displayName: string; provider: string }>;
    onSave: (systemPrompt: string, selectedModel: string) => void;
    voiceSettings?: VoiceSettings;
    availableVoices?: SpeechSynthesisVoice[];
    onVoiceSettingsChange?: (settings: Partial<VoiceSettings>) => void;
}

const AIDocSettingsModal: React.FC<AIDocSettingsModalProps> = ({
    isOpen,
    onClose,
    systemPrompt,
    selectedModel,
    availableModels,
    onSave,
    voiceSettings,
    availableVoices = [],
    onVoiceSettingsChange
}) => {
    const { isDarkMode } = useAuthStore();
    const [localSystemPrompt, setLocalSystemPrompt] = useState(systemPrompt);
    const [localSelectedModel, setLocalSelectedModel] = useState(selectedModel);
    const [activeTab, setActiveTab] = useState<'general' | 'voice'>('general');

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

    const tabContainerStyle: React.CSSProperties = {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        borderBottom: `2px solid ${isDarkMode ? '#444' : '#ddd'}`,
    };

    const tabStyle = (isActive: boolean): React.CSSProperties => ({
        padding: '10px 20px',
        cursor: 'pointer',
        border: 'none',
        background: 'none',
        fontSize: '14px',
        fontWeight: '600',
        color: isActive ? (isDarkMode ? '#4a90e2' : '#007bff') : (isDarkMode ? '#999' : '#666'),
        borderBottom: isActive ? `3px solid ${isDarkMode ? '#4a90e2' : '#007bff'}` : 'none',
        marginBottom: '-2px',
        transition: 'all 0.2s',
    });

    const checkboxContainerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '15px',
    };

    const checkboxStyle: React.CSSProperties = {
        width: '18px',
        height: '18px',
        cursor: 'pointer',
    };

    const rangeContainerStyle: React.CSSProperties = {
        marginBottom: '15px',
    };

    const rangeStyle: React.CSSProperties = {
        width: '100%',
        cursor: 'pointer',
    };

    return (
        <div style={modalOverlayStyle} onClick={onClose}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                <h2 style={{ marginTop: 0, marginBottom: '20px' }}>AIDoc Settings</h2>

                {/* Tabs */}
                <div style={tabContainerStyle}>
                    <button
                        style={tabStyle(activeTab === 'general')}
                        onClick={() => setActiveTab('general')}
                    >
                        General
                    </button>
                    <button
                        style={tabStyle(activeTab === 'voice')}
                        onClick={() => setActiveTab('voice')}
                    >
                        🎤 Voice Mode
                    </button>
                </div>

                {/* General Settings Tab */}
                {activeTab === 'general' && (
                    <>
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
                    </>
                )}

                {/* Voice Settings Tab */}
                {activeTab === 'voice' && voiceSettings && onVoiceSettingsChange && (
                    <>
                        {/* Voice Provider Selection */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Voice Provider</label>
                            <select
                                value={voiceSettings.provider || 'browser'}
                                onChange={(e) => onVoiceSettingsChange({ provider: e.target.value as 'browser' | 'openai' })}
                                style={selectStyle}
                            >
                                <option value="browser">Browser Voice (Free, Offline)</option>
                                <option value="openai">OpenAI Voice (Premium, Requires API Key)</option>
                            </select>
                            <div style={{
                                fontSize: '12px',
                                color: isDarkMode ? '#999' : '#666',
                                marginTop: '5px'
                            }}>
                                {voiceSettings.provider === 'openai' ? (
                                    <>
                                        ✨ <strong>OpenAI Voice:</strong> More natural-sounding voices with better medical terminology pronunciation. Requires OpenAI API key and incurs usage costs.
                                    </>
                                ) : (
                                    <>
                                        🌐 <strong>Browser Voice:</strong> Free and works offline. Uses your device's built-in speech recognition and synthesis.
                                    </>
                                )}
                            </div>
                        </div>

                        <div style={checkboxContainerStyle}>
                            <input
                                type="checkbox"
                                id="pushToTalk"
                                checked={voiceSettings.pushToTalk}
                                onChange={(e) => onVoiceSettingsChange({ pushToTalk: e.target.checked })}
                                style={checkboxStyle}
                            />
                            <label htmlFor="pushToTalk" style={{ cursor: 'pointer', fontSize: '14px' }}>
                                Push-to-Talk Mode (click mic to speak, otherwise continuous listening)
                            </label>
                        </div>

                        <div style={checkboxContainerStyle}>
                            <input
                                type="checkbox"
                                id="autoSpeak"
                                checked={voiceSettings.autoSpeak}
                                onChange={(e) => onVoiceSettingsChange({ autoSpeak: e.target.checked })}
                                style={checkboxStyle}
                            />
                            <label htmlFor="autoSpeak" style={{ cursor: 'pointer', fontSize: '14px' }}>
                                Auto-speak AI responses
                            </label>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Speech Language</label>
                            <select
                                value={voiceSettings.language}
                                onChange={(e) => onVoiceSettingsChange({ language: e.target.value })}
                                style={selectStyle}
                            >
                                <option value="en-US">English (US)</option>
                                <option value="en-GB">English (UK)</option>
                                <option value="es-ES">Spanish</option>
                                <option value="fr-FR">French</option>
                                <option value="de-DE">German</option>
                                <option value="it-IT">Italian</option>
                                <option value="pt-BR">Portuguese (Brazil)</option>
                                <option value="zh-CN">Chinese (Mandarin)</option>
                                <option value="ja-JP">Japanese</option>
                                <option value="ko-KR">Korean</option>
                                <option value="vi-VN">Vietnamese</option>
                            </select>
                        </div>

                        <div style={rangeContainerStyle}>
                            <label style={labelStyle}>
                                Speech Rate: {voiceSettings.speechRate.toFixed(1)}x
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.1"
                                value={voiceSettings.speechRate}
                                onChange={(e) => onVoiceSettingsChange({ speechRate: parseFloat(e.target.value) })}
                                style={rangeStyle}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: isDarkMode ? '#999' : '#666' }}>
                                <span>Slower</span>
                                <span>Faster</span>
                            </div>
                        </div>

                        {/* Browser Voice Selection */}
                        {voiceSettings.provider === 'browser' && availableVoices.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <label style={labelStyle}>Voice Selection (Browser)</label>
                                <select
                                    value={voiceSettings.voiceName || ''}
                                    onChange={(e) => onVoiceSettingsChange({ voiceName: e.target.value || undefined })}
                                    style={selectStyle}
                                >
                                    <option value="">Default Voice</option>
                                    {availableVoices
                                        .filter(voice => voice.lang.startsWith(voiceSettings.language.split('-')[0]))
                                        .map((voice) => (
                                            <option key={voice.name} value={voice.name}>
                                                {voice.name} ({voice.lang})
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>
                        )}

                        {/* OpenAI Voice Settings */}
                        {voiceSettings.provider === 'openai' && (
                            <>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={labelStyle}>OpenAI Voice</label>
                                    <select
                                        value={voiceSettings.openaiVoice || 'alloy'}
                                        onChange={(e) => onVoiceSettingsChange({ openaiVoice: e.target.value as any })}
                                        style={selectStyle}
                                    >
                                        <option value="alloy">Alloy (Neutral, Balanced)</option>
                                        <option value="echo">Echo (Male, Clear)</option>
                                        <option value="fable">Fable (British, Expressive)</option>
                                        <option value="onyx">Onyx (Deep Male)</option>
                                        <option value="nova">Nova (Female, Warm)</option>
                                        <option value="shimmer">Shimmer (Female, Soft)</option>
                                    </select>
                                    <div style={{
                                        fontSize: '12px',
                                        color: isDarkMode ? '#999' : '#666',
                                        marginTop: '5px'
                                    }}>
                                        🎭 Preview different voices to find the one that sounds best for medical consultations
                                    </div>
                                </div>

                                <div style={rangeContainerStyle}>
                                    <label style={labelStyle}>
                                        OpenAI Speech Speed: {(voiceSettings.openaiSpeed || 1.0).toFixed(1)}x
                                    </label>
                                    <input
                                        type="range"
                                        min="0.25"
                                        max="4.0"
                                        step="0.25"
                                        value={voiceSettings.openaiSpeed || 1.0}
                                        onChange={(e) => onVoiceSettingsChange({ openaiSpeed: parseFloat(e.target.value) })}
                                        style={rangeStyle}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: isDarkMode ? '#999' : '#666' }}>
                                        <span>0.25x</span>
                                        <span>4.0x</span>
                                    </div>
                                </div>

                                <div style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    backgroundColor: isDarkMode ? '#3a2a1a' : '#fff3cd',
                                    border: `1px solid ${isDarkMode ? '#5f4d2d' : '#ffeaa7'}`,
                                    fontSize: '13px',
                                    marginTop: '15px',
                                    marginBottom: '15px'
                                }}>
                                    <strong>⚠️ OpenAI Voice Costs:</strong>
                                    <ul style={{ marginTop: '8px', marginBottom: '0', paddingLeft: '20px' }}>
                                        <li>Whisper (STT): ~$0.006 per minute of audio</li>
                                        <li>TTS: ~$0.015 per 1,000 characters</li>
                                        <li>Costs are charged to your OpenAI API account</li>
                                        <li>Consider using browser mode for cost-free operation</li>
                                    </ul>
                                </div>
                            </>
                        )}

                        <div style={{
                            padding: '12px',
                            borderRadius: '8px',
                            backgroundColor: isDarkMode ? '#1a3a1f' : '#d4edda',
                            border: `1px solid ${isDarkMode ? '#2d5f3d' : '#c3e6cb'}`,
                            fontSize: '13px',
                            marginTop: '15px'
                        }}>
                            <strong>💡 Voice Mode Tips:</strong>
                            <ul style={{ marginTop: '8px', marginBottom: '0', paddingLeft: '20px' }}>
                                <li>Click the microphone button to enable/disable voice mode</li>
                                <li>In continuous mode, speak naturally - the system detects when you finish</li>
                                <li>In push-to-talk mode, click the mic each time you want to speak</li>
                                <li>Use the speaker icon to mute/unmute AI responses</li>
                                <li>Grant microphone permissions when prompted by your browser</li>
                                {voiceSettings.provider === 'openai' && (
                                    <li><strong>OpenAI mode:</strong> Requires internet connection and API key</li>
                                )}
                            </ul>
                        </div>
                    </>
                )}

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

