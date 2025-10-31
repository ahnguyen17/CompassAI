import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import apiClient from '../services/api';
import styles from './AIDocPage.module.css';
import AIDocPasswordModal from '../components/AIDocPasswordModal';
import AIDocSettingsModal from '../components/AIDocSettingsModal';
import VoiceControls from '../components/VoiceControls';
import { useVoiceInteraction } from '../hooks/useVoiceInteraction';
import { useStreamingTTS } from '../hooks/useStreamingTTS';

// Default medical triage system prompt
const DEFAULT_SYSTEM_PROMPT = `You are an AI Medical Doctor designed to triage patients efficiently and safely. Your responsibilities include:

Asking targeted, relevant, and comprehensive questions to gather patient symptoms, medical history, and other necessary information.
Using empathetic and professional language that is clear and understandable to patients of varying medical literacy.
Analyzing the information provided to formulate a prioritized differential diagnosis.
Displaying clinical reasoning by asking appropriate follow-up questions as needed.
Summarizing the encounter in a detailed and well-structured SOAP (Subjective, Objective, Assessment, Plan) note.
Providing an initial assessment and clearly explaining your reasoning.
Outlining specific and practical next steps or recommendations for care (the plan), including when to seek further evaluation or emergency care.

Throughout, always:
- Adhere to evidence-based medicine and recognized clinical guidelines.
- Maintain patient safety and confidentiality.
- Avoid providing a definitive diagnosis without adequate information or outside your scope.

At the end of each triage session, output a SOAP note in the following format:

Subjective:
Objective:
Assessment:
Plan:`;

interface AIDocSession {
    _id: string;
    title: string;
    createdAt: string;
    lastAccessedAt: string;
    lastMessageTimestamp?: string;
    systemPrompt?: string;
    modelUsed?: string;
}

interface AIDocMessage {
    _id: string;
    sender: 'user' | 'ai';
    content: string;
    timestamp: string;
    modelUsed?: string;
    reasoningContent?: string;
}

interface AvailableModel {
    name: string;
    displayName: string;
    provider: string;
}

const AIDocPage: React.FC = () => {
    const navigate = useNavigate();
    const { sessionId } = useParams<{ sessionId: string }>();
    const { isDarkMode, isLoggedIn, authLoading } = useAuthStore();

    // Authentication state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    // Session state
    const [sessions, setSessions] = useState<AIDocSession[]>([]);
    const [currentSession, setCurrentSession] = useState<AIDocSession | null>(null);
    const [messages, setMessages] = useState<AIDocMessage[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);

    // UI state
    const [isSidebarVisible, setIsSidebarVisible] = useState(window.innerWidth > 768);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [error, setError] = useState('');

    // Settings state
    const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
    const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');
    const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);

    // Streaming state
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
    const [streamingMessageContent, setStreamingMessageContent] = useState('');

    // Refs
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const lastAiMessageRef = useRef<string>('');

    // Ref to hold streaming TTS instance (to avoid circular dependency)
    const streamingTTSRef = useRef<any>(null);

    // Voice interaction hook
    const {
        voiceState,
        settings: voiceSettings,
        toggleListening,
        speak,
        stopSpeaking,
        updateSettings: updateVoiceSettings,
    } = useVoiceInteraction({
        onTranscriptComplete: (transcript) => {
            // Stop any ongoing streaming TTS (user is interrupting)
            if (streamingTTSRef.current) {
                streamingTTSRef.current.stop();
            }

            // Set the transcript as the new message (for display in input)
            setNewMessage(transcript);
            // Auto-send the message immediately with the transcript
            if (transcript.trim() && currentSession?._id && !sendingMessage) {
                handleSendMessage(undefined, transcript);
            }
        },
        onError: (error) => {
            setError(error);
        },
    });

    // Streaming TTS hook for real-time speech during AI response generation
    const streamingTTS = useStreamingTTS({
        voice: voiceSettings.voice,
        speed: voiceSettings.speed,
        onStart: () => {
            console.log('[AIDoc] Streaming TTS started');
            // Stop recording if currently listening
            if (voiceState.isListening) {
                stopSpeaking();
            }
        },
        onEnd: () => {
            console.log('[AIDoc] Streaming TTS ended');
        },
        onError: (error) => {
            console.error('[AIDoc] Streaming TTS error:', error);
            setError(error);
        },
    });

    // Update ref
    streamingTTSRef.current = streamingTTS;

    // Ref to track latest voice settings (avoid closure issues in async callbacks)
    const voiceSettingsRef = useRef(voiceSettings);

    // Keep voiceSettings ref updated
    useEffect(() => {
        voiceSettingsRef.current = voiceSettings;
    }, [voiceSettings]);

    // Check authentication on mount
    useEffect(() => {
        const authenticated = sessionStorage.getItem('aiDocAuthenticated') === 'true';
        setIsAuthenticated(authenticated);
        setCheckingAuth(false);
    }, []);

    // Load settings from localStorage
    useEffect(() => {
        const savedPrompt = localStorage.getItem('aiDocSystemPrompt');
        const savedModel = localStorage.getItem('aiDocSelectedModel');

        if (savedPrompt) setSystemPrompt(savedPrompt);
        if (savedModel) setSelectedModel(savedModel);
    }, []);

    // Handle responsive sidebar - auto-collapse on mobile
    useEffect(() => {
        const handleResize = () => {
            const isMobile = window.innerWidth <= 768;
            setIsSidebarVisible(!isMobile);
        };

        // Set initial state
        handleResize();

        // Add event listener
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch available models
    useEffect(() => {
        const fetchModels = async () => {
            try {
                const response = await apiClient.get('/providers/models');
                if (response.data?.success) {
                    const models: AvailableModel[] = [];
                    const modelData = response.data.data;

                    // Check if the response has the new structure with baseModels
                    if (modelData.baseModels && typeof modelData.baseModels === 'object') {
                        // New structure: { baseModels: { Gemini: [...], DeepSeek: [...] }, customModels: [...] }
                        const baseModels = modelData.baseModels;

                        // Preferred providers for medical use
                        const preferredProviders = ['Gemini', 'DeepSeek', 'OpenAI', 'Anthropic'];

                        // First, try to get models from preferred providers
                        preferredProviders.forEach(provider => {
                            if (baseModels[provider] && Array.isArray(baseModels[provider])) {
                                baseModels[provider].forEach((model: any) => {
                                    models.push({
                                        name: model.name,
                                        displayName: model.displayName || model.name,
                                        provider: provider
                                    });
                                });
                            }
                        });

                        // If no preferred models found, include all available base models
                        if (models.length === 0) {
                            Object.keys(baseModels).forEach(provider => {
                                if (baseModels[provider] && Array.isArray(baseModels[provider])) {
                                    baseModels[provider].forEach((model: any) => {
                                        models.push({
                                            name: model.name,
                                            displayName: model.displayName || model.name,
                                            provider: provider
                                        });
                                    });
                                }
                            });
                        }
                    } else {
                        // Old structure (fallback): { Gemini: [...], DeepSeek: [...], ... }
                        const preferredProviders = ['Gemini', 'DeepSeek', 'OpenAI', 'Anthropic'];

                        preferredProviders.forEach(provider => {
                            if (modelData[provider] && Array.isArray(modelData[provider])) {
                                modelData[provider].forEach((model: any) => {
                                    models.push({
                                        name: model.name,
                                        displayName: model.displayName || model.name,
                                        provider: provider
                                    });
                                });
                            }
                        });

                        if (models.length === 0) {
                            Object.keys(modelData).forEach(provider => {
                                if (modelData[provider] && Array.isArray(modelData[provider])) {
                                    modelData[provider].forEach((model: any) => {
                                        models.push({
                                            name: model.name,
                                            displayName: model.displayName || model.name,
                                            provider: provider
                                        });
                                    });
                                }
                            });
                        }
                    }

                    setAvailableModels(models);

                    // Set default model if not already set
                    if (!localStorage.getItem('aiDocSelectedModel') && models.length > 0) {
                        setSelectedModel(models[0].name);
                    }
                }
            } catch (err) {
                console.error('Error fetching models:', err);
                // Set fallback models if API fails
                const fallbackModels: AvailableModel[] = [
                    { name: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo', provider: 'OpenAI' },
                    { name: 'gpt-4', displayName: 'GPT-4', provider: 'OpenAI' },
                    { name: 'gemini-pro', displayName: 'Gemini Pro', provider: 'Gemini' },
                    { name: 'deepseek-chat', displayName: 'DeepSeek Chat', provider: 'DeepSeek' },
                    { name: 'claude-3-5-sonnet-20241022', displayName: 'Claude 3.5 Sonnet', provider: 'Anthropic' }
                ];
                setAvailableModels(fallbackModels);
                if (!localStorage.getItem('aiDocSelectedModel')) {
                    setSelectedModel('gpt-3.5-turbo');
                }
            }
        };

        if (isAuthenticated && isLoggedIn) {
            fetchModels();
        }
    }, [isAuthenticated, isLoggedIn]);

    // Fetch sessions
    const fetchSessions = async () => {
        setLoadingSessions(true);
        try {
            const response = await apiClient.get('/aidocsessions');
            if (response.data?.success) {
                setSessions(response.data.data);
            }
        } catch (err: any) {
            console.error('Error fetching AIDoc sessions:', err);
            if (err.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setLoadingSessions(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated && isLoggedIn && !authLoading) {
            fetchSessions();
        }
    }, [isAuthenticated, isLoggedIn, authLoading]);

    // Handle session selection from URL
    useEffect(() => {
        if (sessionId && sessions.length > 0) {
            const session = sessions.find(s => s._id === sessionId);
            if (session) {
                setCurrentSession(session);
            }
        } else if (sessions.length > 0 && !currentSession) {
            // Auto-select first session if none selected
            setCurrentSession(sessions[0]);
            navigate(`/aidoc/${sessions[0]._id}`, { replace: true });
        }
    }, [sessionId, sessions]);

    // Fetch messages when session changes
    useEffect(() => {
        if (currentSession) {
            fetchMessages(currentSession._id);
        }
    }, [currentSession]);

    const fetchMessages = async (sessionId: string) => {
        if (!sessionId) return;
        setLoadingMessages(true);
        setError('');
        setMessages([]);
        
        try {
            const response = await apiClient.get(`/aidocsessions/${sessionId}/messages`);
            if (response.data?.success) {
                setMessages(response.data.data);
            }
        } catch (err: any) {
            console.error('Error fetching messages:', err);
            setError('Failed to load messages');
            if (err.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setLoadingMessages(false);
        }
    };

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingMessageContent]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [newMessage]);

    const handleAuthSuccess = () => {
        setIsAuthenticated(true);
    };

    const startNewSession = async () => {
        try {
            const response = await apiClient.post('/aidocsessions', {
                title: 'New Medical Consultation',
                systemPrompt: systemPrompt,
                modelUsed: selectedModel
            });

            if (response.data?.success) {
                const newSession = response.data.data;
                setSessions([newSession, ...sessions]);
                setCurrentSession(newSession);
                navigate(`/aidoc/${newSession._id}`);
                // Auto-close sidebar on mobile after creating new session
                if (window.innerWidth <= 768) {
                    setIsSidebarVisible(false);
                }
            }
        } catch (err: any) {
            console.error('Error creating session:', err);
            setError('Failed to create new session');
        }
    };

    const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        
        if (!confirm('Are you sure you want to delete this consultation?')) {
            return;
        }

        try {
            await apiClient.delete(`/aidocsessions/${sessionId}`);
            setSessions(sessions.filter(s => s._id !== sessionId));
            
            if (currentSession?._id === sessionId) {
                if (sessions.length > 1) {
                    const nextSession = sessions.find(s => s._id !== sessionId);
                    if (nextSession) {
                        setCurrentSession(nextSession);
                        navigate(`/aidoc/${nextSession._id}`);
                    }
                } else {
                    setCurrentSession(null);
                    setMessages([]);
                    navigate('/aidoc');
                }
            }
        } catch (err) {
            console.error('Error deleting session:', err);
            setError('Failed to delete session');
        }
    };

    const handleSaveSettings = (newSystemPrompt: string, newSelectedModel: string) => {
        setSystemPrompt(newSystemPrompt);
        setSelectedModel(newSelectedModel);

        // Save to localStorage
        localStorage.setItem('aiDocSystemPrompt', newSystemPrompt);
        localStorage.setItem('aiDocSelectedModel', newSelectedModel);

        // Update current session if exists
        if (currentSession) {
            apiClient.put(`/aidocsessions/${currentSession._id}`, {
                systemPrompt: newSystemPrompt,
                modelUsed: newSelectedModel
            }).catch(err => console.error('Error updating session settings:', err));
        }
    };

    // Voice mode handlers
    const handleToggleVoiceMode = () => {
        const newEnabled = !voiceSettings.enabled;
        updateVoiceSettings({ enabled: newEnabled });

        if (newEnabled) {
            // Start listening when voice mode is enabled
            toggleListening();
        } else {
            // Stop everything when voice mode is disabled
            stopSpeaking();
        }
    };

    const handleToggleMute = () => {
        updateVoiceSettings({ autoSpeak: !voiceSettings.autoSpeak });
        if (!voiceSettings.autoSpeak) {
            // If we're unmuting and there's a recent AI message, offer to replay it
            if (lastAiMessageRef.current) {
                speak(lastAiMessageRef.current, true);
            }
        } else {
            // If muting, stop current speech (both streaming and regular)
            stopSpeaking();
            streamingTTS.stop();
        }
    };

    const handleSendMessage = async (e?: React.FormEvent, messageOverride?: string) => {
        if (e) e.preventDefault();

        // Use messageOverride if provided (for voice input), otherwise use newMessage
        const messageToSend = messageOverride !== undefined ? messageOverride : newMessage;

        if (!messageToSend.trim() || !currentSession?._id || sendingMessage) return;

        const sessionId = currentSession._id;
        setSendingMessage(true);
        setError('');
        setStreamingMessageId(null);
        setStreamingMessageContent('');

        const userMessageContent = messageToSend;
        setNewMessage('');

        // Reset streaming TTS for new response
        streamingTTS.reset();

        // Optimistic user message
        const optimisticUserMessage: AIDocMessage = {
            _id: `temp-user-${Date.now()}`,
            sender: 'user',
            content: userMessageContent,
            timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, optimisticUserMessage]);

        // Optimistic AI message placeholder
        const optimisticAiMessageId = `temp-ai-${Date.now()}`;
        const optimisticAiMessage: AIDocMessage = {
            _id: optimisticAiMessageId,
            sender: 'ai',
            content: '',
            timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, optimisticAiMessage]);
        setStreamingMessageId(optimisticAiMessageId);

        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;

        try {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
            const fetchUrl = apiBaseUrl
                ? `${apiBaseUrl}/aidocsessions/${sessionId}/messages`
                : `/api/v1/aidocsessions/${sessionId}/messages`;

            const response = await fetch(fetchUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    content: userMessageContent,
                    model: selectedModel,
                    stream: 'true'
                }),
                signal
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('No reader available');
            }

            let buffer = '';
            let done = false;

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;

                if (value) {
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data.trim()) {
                                try {
                                    const parsed = JSON.parse(data);

                                    if (parsed.type === 'user_message_saved') {
                                        setMessages((prev) =>
                                            prev.map((msg) =>
                                                msg._id === optimisticUserMessage._id
                                                    ? parsed.message
                                                    : msg
                                            )
                                        );
                                    } else if (parsed.type === 'title_update') {
                                        setSessions((prev) =>
                                            prev.map((s) =>
                                                s._id === sessionId
                                                    ? { ...s, title: parsed.title }
                                                    : s
                                            )
                                        );
                                        if (currentSession._id === sessionId) {
                                            setCurrentSession((prev) =>
                                                prev ? { ...prev, title: parsed.title } : prev
                                            );
                                        }
                                    } else if (parsed.type === 'content') {
                                        setStreamingMessageContent((prev) => {
                                            const updated = prev + parsed.content;
                                            console.log('[AIDoc] Streaming content updated, length:', updated.length);
                                            return updated;
                                        });

                                        // Add chunk to streaming TTS if voice mode is enabled
                                        const currentVoiceSettings = voiceSettingsRef.current;
                                        if (currentVoiceSettings.enabled && currentVoiceSettings.autoSpeak) {
                                            streamingTTS.addChunk(parsed.content);
                                        }
                                    } else if (parsed.type === 'ai_message_saved') {
                                        console.log('[AIDoc] AI message saved:', {
                                            optimisticId: optimisticAiMessageId,
                                            savedMessageId: parsed.message?._id,
                                            hasContent: !!parsed.message?.content,
                                            contentLength: parsed.message?.content?.length,
                                            currentStreamingContent: streamingMessageContent.length
                                        });

                                        // Update the message with the saved message
                                        setMessages((prev) => {
                                            const updated = prev.map((msg) =>
                                                msg._id === optimisticAiMessageId
                                                    ? parsed.message
                                                    : msg
                                            );
                                            console.log('[AIDoc] Messages after update:', updated.map(m => ({
                                                id: m._id,
                                                sender: m.sender,
                                                contentLength: m.content?.length
                                            })));
                                            return updated;
                                        });

                                        // Only clear streamingMessageId, keep streamingMessageContent
                                        // This ensures the content remains visible until next message
                                        setStreamingMessageId(null);
                                        // DON'T clear streamingMessageContent here - it will be cleared on next message

                                        // Flush any remaining text in streaming TTS
                                        const currentVoiceSettings = voiceSettingsRef.current;
                                        console.log('[AIDoc] AI message saved, flushing streaming TTS');
                                        if (currentVoiceSettings.enabled && currentVoiceSettings.autoSpeak) {
                                            streamingTTS.flush();
                                        }

                                        lastAiMessageRef.current = parsed.message?.content || '';
                                    } else if (parsed.type === 'error') {
                                        setError(parsed.error);
                                        setMessages((prev) =>
                                            prev.filter((msg) => msg._id !== optimisticAiMessageId)
                                        );
                                    } else if (parsed.type === 'done') {
                                        // Stream complete
                                    }
                                } catch (parseError) {
                                    console.error('Error parsing SSE data:', parseError);
                                }
                            }
                        }
                    }
                }
            }
        } catch (err: any) {
            console.error('Send Message Error:', err);
            if (err.name !== 'AbortError') {
                setError(err.message || 'Error sending message');
                setMessages((prev) =>
                    prev.filter((msg) => msg._id !== optimisticAiMessageId)
                );
            }
        } finally {
            setSendingMessage(false);
            // Don't clear streamingMessageId here - it's handled in ai_message_saved event
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Show password modal if not authenticated
    if (checkingAuth) {
        return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
        return <AIDocPasswordModal onSuccess={handleAuthSuccess} />;
    }

    // Show loading if auth is still loading
    if (authLoading) {
        return <div>Loading authentication...</div>;
    }

    // Redirect to login if not logged in
    if (!isLoggedIn) {
        navigate('/login');
        return null;
    }

    const medicalTheme = {
        primary: isDarkMode ? '#4a90e2' : '#007bff',
        secondary: isDarkMode ? '#2d5f8d' : '#0056b3',
        background: isDarkMode ? '#1a1a1a' : '#f8f9fa',
        surface: isDarkMode ? '#2a2a2a' : '#ffffff',
        text: isDarkMode ? '#e0e0e0' : '#333333',
        border: isDarkMode ? '#444' : '#dee2e6',
        userBubble: isDarkMode ? '#1e4d2b' : '#d4edda',
        aiBubble: isDarkMode ? '#2d3e50' : '#e7f3ff',
        disclaimer: isDarkMode ? '#3d2a1f' : '#fff3cd',
        disclaimerBorder: isDarkMode ? '#8b6914' : '#ffc107',
    };

    return (
        <div className={styles.aiDocContainer} style={{ backgroundColor: medicalTheme.background }}>
            {/* Mobile overlay backdrop */}
            {isSidebarVisible && window.innerWidth <= 768 && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 99,
                    }}
                    onClick={() => setIsSidebarVisible(false)}
                />
            )}

            {/* Sidebar */}
            <div
                className={`${styles.aiDocSidebar} ${isSidebarVisible ? '' : styles.aiDocSidebarHidden}`}
                style={{ backgroundColor: medicalTheme.surface }}
            >
                {isSidebarVisible && (
                    <>
                        <h4 style={{ marginBottom: '15px', color: medicalTheme.text }}>
                            Medical Consultations
                        </h4>
                        <button
                            onClick={startNewSession}
                            className={styles.newSessionButton}
                            style={{
                                backgroundColor: medicalTheme.primary,
                                color: '#ffffff'
                            }}
                        >
                            + New Consultation
                        </button>
                        {loadingSessions ? (
                            <p style={{ color: medicalTheme.text }}>Loading...</p>
                        ) : (
                            <ul className={styles.sessionList}>
                                {sessions.map((session) => (
                                    <li
                                        key={session._id}
                                        className={`${styles.sessionListItem} ${
                                            currentSession?._id === session._id
                                                ? styles.sessionListItemActive
                                                : ''
                                        }`}
                                        style={{
                                            backgroundColor:
                                                currentSession?._id === session._id
                                                    ? medicalTheme.primary
                                                    : 'transparent',
                                            color:
                                                currentSession?._id === session._id
                                                    ? '#ffffff'
                                                    : medicalTheme.text
                                        }}
                                        onClick={() => {
                                            setCurrentSession(session);
                                            navigate(`/aidoc/${session._id}`);
                                            // Auto-close sidebar on mobile after selecting session
                                            if (window.innerWidth <= 768) {
                                                setIsSidebarVisible(false);
                                            }
                                        }}
                                    >
                                        {session.title}
                                        <button
                                            className={styles.deleteButton}
                                            onClick={(e) => deleteSession(session._id, e)}
                                            title="Delete consultation"
                                        >
                                            🗑️
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </div>

            {/* Main Area */}
            <div className={styles.mainAIDocArea}>
                {/* Toggle Sidebar Button */}
                <button
                    className={styles.toggleButton}
                    onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                    style={{ color: medicalTheme.text }}
                >
                    {isSidebarVisible ? '◀' : '▶'}
                </button>

                {/* Header */}
                <div
                    className={styles.medicalHeader}
                    style={{
                        borderBottomColor: medicalTheme.primary,
                        color: medicalTheme.text
                    }}
                >
                    <div className={styles.medicalIcon}>🏥</div>
                    <h1 className={styles.medicalTitle}>AIDoc - Medical Triage Assistant</h1>
                    <button
                        className={styles.settingsButton}
                        onClick={() => setIsSettingsOpen(true)}
                        style={{
                            backgroundColor: medicalTheme.primary,
                            color: '#ffffff'
                        }}
                    >
                        ⚙️ Settings
                    </button>
                </div>

                {/* Disclaimer */}
                <div
                    className={styles.disclaimer}
                    style={{
                        backgroundColor: medicalTheme.disclaimer,
                        borderLeftColor: medicalTheme.disclaimerBorder,
                        color: medicalTheme.text
                    }}
                >
                    <strong>⚠️ Medical Disclaimer:</strong> This AI assistant is for informational
                    purposes only and does not replace professional medical advice, diagnosis, or
                    treatment. Always seek the advice of your physician or other qualified health
                    provider with any questions you may have regarding a medical condition. In case
                    of emergency, call your local emergency services immediately.
                </div>

                {/* Messages */}
                <div
                    className={styles.messageList}
                    style={{ backgroundColor: medicalTheme.background }}
                >
                    {loadingMessages ? (
                        <p style={{ color: medicalTheme.text }}>Loading messages...</p>
                    ) : messages.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: medicalTheme.text }}>
                            <div style={{ fontSize: '48px', marginBottom: '20px' }}>👨‍⚕️</div>
                            <h3>Welcome to AIDoc</h3>
                            <p>Start a new medical consultation by describing your symptoms or concerns.</p>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg) => (
                                <div
                                    key={msg._id}
                                    className={`${styles.messageContainer} ${
                                        msg.sender === 'user'
                                            ? styles.messageContainerUser
                                            : styles.messageContainerAi
                                    }`}
                                >
                                    <div
                                        className={`${styles.messageBubble} ${
                                            msg.sender === 'user'
                                                ? styles.messageBubbleUser
                                                : styles.messageBubbleAi
                                        }`}
                                        style={{
                                            backgroundColor:
                                                msg.sender === 'user'
                                                    ? medicalTheme.userBubble
                                                    : medicalTheme.aiBubble,
                                            color: medicalTheme.text
                                        }}
                                    >
                                        <div style={{ whiteSpace: 'pre-wrap' }}>
                                            {msg._id === streamingMessageId && streamingMessageContent
                                                ? streamingMessageContent
                                                : msg.content}
                                        </div>
                                        {msg.modelUsed && msg.sender === 'ai' && (
                                            <div
                                                style={{
                                                    fontSize: '11px',
                                                    marginTop: '8px',
                                                    opacity: 0.7
                                                }}
                                            >
                                                Model: {msg.modelUsed}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Error Display */}
                {error && (
                    <div style={{ color: '#dc3545', padding: '10px', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                {/* Input Form */}
                {currentSession && (
                    <form className={styles.inputForm} onSubmit={handleSendMessage}>
                        <div className={styles.inputControls}>
                            <textarea
                                ref={textareaRef}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Describe your symptoms or medical concerns..."
                                disabled={sendingMessage || loadingMessages}
                                className={styles.messageInput}
                                rows={1}
                            />
                            <div className={styles.iconRow}>
                                <div className={styles.iconGroupLeft}>
                                    {/* Voice Controls */}
                                    <VoiceControls
                                        voiceState={voiceState}
                                        settings={voiceSettings}
                                        onToggleVoice={handleToggleVoiceMode}
                                        onToggleMute={handleToggleMute}
                                        isDarkMode={isDarkMode}
                                        medicalTheme={medicalTheme}
                                    />
                                </div>
                                <div className={styles.iconGroupRight}>
                                    <span style={{ fontSize: '12px', color: medicalTheme.text, opacity: 0.7, marginRight: '8px' }}>
                                        Press Enter to send, Shift+Enter for new line
                                    </span>
                                    <button
                                        type="submit"
                                        className={styles.sendButton}
                                        disabled={sendingMessage || !newMessage.trim()}
                                        style={{ color: medicalTheme.primary }}
                                    >
                                        {sendingMessage ? '⏳' : '➤'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                )}
            </div>

            {/* Settings Modal */}
            <AIDocSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                systemPrompt={systemPrompt}
                selectedModel={selectedModel}
                availableModels={availableModels}
                onSave={handleSaveSettings}
                voiceSettings={voiceSettings}
                onVoiceSettingsChange={updateVoiceSettings}
            />
        </div>
    );
};

export default AIDocPage;

