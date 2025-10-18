import React from 'react';
import { VoiceState, VoiceSettings } from '../hooks/useVoiceInteraction';
import styles from './VoiceControls.module.css';

interface VoiceControlsProps {
    voiceState: VoiceState;
    settings: VoiceSettings;
    onToggleVoice: () => void;
    onToggleMute: () => void;
    isDarkMode: boolean;
    medicalTheme: {
        primary: string;
        secondary: string;
        text: string;
        background: string;
        surface: string;
    };
}

const VoiceControls: React.FC<VoiceControlsProps> = ({
    voiceState,
    settings,
    onToggleVoice,
    onToggleMute,
    isDarkMode,
    medicalTheme,
}) => {
    const { isListening, isSpeaking, error, interimTranscript } = voiceState;
    const { enabled, autoSpeak } = settings;

    return (
        <div className={styles.voiceControlsContainer}>
            {/* Voice Mode Toggle Button */}
            <button
                className={`${styles.voiceButton} ${enabled ? styles.voiceButtonActive : ''}`}
                onClick={onToggleVoice}
                title={enabled ? 'Disable Voice Mode' : 'Enable Voice Mode'}
                style={{
                    backgroundColor: enabled ? medicalTheme.primary : 'transparent',
                    color: enabled ? '#ffffff' : medicalTheme.text,
                    borderColor: medicalTheme.primary,
                }}
            >
                {enabled ? (
                    <>
                        {isListening ? (
                            <span className={styles.micIconListening}>🎤</span>
                        ) : isSpeaking ? (
                            <span className={styles.speakerIcon}>🔊</span>
                        ) : (
                            <span>🎤</span>
                        )}
                    </>
                ) : (
                    <span>🎤</span>
                )}
            </button>

            {/* Mute TTS Button (only show when voice mode is enabled) */}
            {enabled && (
                <button
                    className={styles.muteButton}
                    onClick={onToggleMute}
                    title={autoSpeak ? 'Mute AI Responses' : 'Unmute AI Responses'}
                    style={{
                        color: medicalTheme.text,
                        opacity: autoSpeak ? 1 : 0.5,
                    }}
                >
                    {autoSpeak ? '🔊' : '🔇'}
                </button>
            )}

            {/* Provider Badge */}
            {enabled && (
                <div
                    style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: settings.provider === 'openai'
                            ? (isDarkMode ? '#2a4a2a' : '#d4edda')
                            : (isDarkMode ? '#2a3a4a' : '#d4e4ed'),
                        color: settings.provider === 'openai'
                            ? (isDarkMode ? '#4ade80' : '#28a745')
                            : (isDarkMode ? '#60a5fa' : '#0066cc'),
                        border: `1px solid ${settings.provider === 'openai'
                            ? (isDarkMode ? '#4ade80' : '#28a745')
                            : (isDarkMode ? '#60a5fa' : '#0066cc')}`,
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                    }}
                    title={settings.provider === 'openai'
                        ? 'Using OpenAI Whisper & TTS (Premium)'
                        : 'Using Browser Voice (Free)'}
                >
                    {settings.provider === 'openai' ? '✨ OpenAI' : '🌐 Browser'}
                </div>
            )}

            {/* Voice Status Indicator */}
            {enabled && (
                <div className={styles.statusContainer}>
                    {isListening && (
                        <div 
                            className={styles.listeningIndicator}
                            style={{ color: medicalTheme.primary }}
                        >
                            <div className={styles.pulseRing}></div>
                            <span className={styles.statusText}>Listening...</span>
                        </div>
                    )}
                    
                    {isSpeaking && (
                        <div 
                            className={styles.speakingIndicator}
                            style={{ color: medicalTheme.secondary }}
                        >
                            <div className={styles.waveform}>
                                <div className={styles.bar}></div>
                                <div className={styles.bar}></div>
                                <div className={styles.bar}></div>
                                <div className={styles.bar}></div>
                            </div>
                            <span className={styles.statusText}>AI Speaking...</span>
                        </div>
                    )}

                    {/* Interim Transcript Display */}
                    {interimTranscript && (
                        <div 
                            className={styles.interimTranscript}
                            style={{ 
                                backgroundColor: medicalTheme.surface,
                                color: medicalTheme.text,
                                borderColor: medicalTheme.primary,
                            }}
                        >
                            <span className={styles.transcriptLabel}>Hearing: </span>
                            <span className={styles.transcriptText}>{interimTranscript}</span>
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className={styles.errorMessage}>
                            ⚠️ {error}
                        </div>
                    )}
                </div>
            )}

            {/* Voice Mode Info (when enabled but not active) */}
            {enabled && !isListening && !isSpeaking && !error && (
                <div 
                    className={styles.infoText}
                    style={{ color: medicalTheme.text }}
                >
                    <span className={styles.infoIcon}>ℹ️</span>
                    Voice mode active - speak naturally
                </div>
            )}
        </div>
    );
};

export default VoiceControls;

