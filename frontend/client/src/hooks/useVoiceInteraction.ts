import { useState, useRef, useEffect, useCallback } from 'react';
import apiClient from '../services/api';

export interface VoiceSettings {
    enabled: boolean;
    autoSpeak: boolean; // Auto-speak AI responses
    language: string;
    pushToTalk: boolean; // If false, continuous listening
    voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'; // OpenAI TTS voice
    speed: number; // OpenAI TTS speed (0.25 - 4.0)
}

export interface VoiceState {
    isListening: boolean;
    isSpeaking: boolean;
    isProcessing: boolean;
    error: string | null;
    transcript: string;
    interimTranscript: string;
}

interface UseVoiceInteractionProps {
    onTranscriptComplete: (transcript: string) => void;
    onError?: (error: string) => void;
    settings?: Partial<VoiceSettings>;
}

const DEFAULT_SETTINGS: VoiceSettings = {
    enabled: false,
    autoSpeak: true,
    language: 'en-US',
    pushToTalk: false,
    voice: 'alloy',
    speed: 1.0,
};

export const useVoiceInteraction = ({
    onTranscriptComplete,
    onError,
    settings: userSettings = {},
}: UseVoiceInteractionProps) => {
    const [settings, setSettings] = useState<VoiceSettings>(() => {
        // Load settings from localStorage
        const saved = localStorage.getItem('aiDocVoiceSettings');
        if (saved) {
            try {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(saved), ...userSettings };
            } catch (e) {
                console.error('Failed to parse voice settings:', e);
            }
        }
        return { ...DEFAULT_SETTINGS, ...userSettings };
    });

    const [voiceState, setVoiceState] = useState<VoiceState>({
        isListening: false,
        isSpeaking: false,
        isProcessing: false,
        error: null,
        transcript: '',
        interimTranscript: '',
    });

    const silenceTimerRef = useRef<number | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const shouldRestartListeningRef = useRef<boolean>(false);

    // Save settings to localStorage
    useEffect(() => {
        localStorage.setItem('aiDocVoiceSettings', JSON.stringify(settings));
    }, [settings]);

    // ============================================
    // Whisper STT + OpenAI TTS
    // ============================================

    // Whisper: Transcribe audio
    const transcribeWithWhisper = useCallback(async (audioBlob: Blob) => {
        try {
            setVoiceState(prev => ({ ...prev, isProcessing: true }));

            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            formData.append('language', settings.language.split('-')[0]); // Extract language code (e.g., 'en' from 'en-US')

            const response = await apiClient.post('/aidoc/voice/transcribe', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.success && response.data.transcript) {
                const transcript = response.data.transcript;
                setVoiceState(prev => ({ ...prev, transcript, isProcessing: false }));
                onTranscriptComplete(transcript);
            } else {
                throw new Error('No transcript received');
            }
        } catch (error: any) {
            console.error('Whisper transcription error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to transcribe audio';
            setVoiceState(prev => ({ ...prev, error: errorMessage, isProcessing: false }));
            onError?.(errorMessage);
        }
    }, [settings.language, onTranscriptComplete, onError]);

    // Start recording audio
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await transcribeWithWhisper(audioBlob);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());

                // In continuous mode, restart listening after transcription
                if (shouldRestartListeningRef.current && !settings.pushToTalk) {
                    // Small delay before restarting to avoid immediate re-recording
                    setTimeout(() => {
                        startRecording();
                    }, 500);
                }
            };

            mediaRecorder.start();
            setVoiceState(prev => ({ ...prev, isListening: true, error: null }));

            // In push-to-talk mode, we'll stop manually
            // In continuous mode, stop after silence detection
            if (!settings.pushToTalk) {
                // Start silence detection timer
                silenceTimerRef.current = window.setTimeout(() => {
                    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                        mediaRecorderRef.current.stop();
                    }
                }, 5000); // 5 seconds of recording max in continuous mode
            }
        } catch (error) {
            console.error('Error starting recording:', error);
            const errorMessage = 'Microphone access denied. Please allow microphone access.';
            setVoiceState(prev => ({ ...prev, error: errorMessage, isListening: false }));
            onError?.(errorMessage);
        }
    }, [settings.pushToTalk, onError, transcribeWithWhisper]);

    // Stop recording audio
    const stopRecording = useCallback(() => {
        // Disable auto-restart when manually stopping
        shouldRestartListeningRef.current = false;

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
        setVoiceState(prev => ({ ...prev, isListening: false }));
    }, []);

    // OpenAI TTS: Speak text
    const speak = useCallback(async (text: string, interrupt: boolean = false) => {
        if (!text.trim()) return;

        try {
            // Stop current audio if interrupting
            if (interrupt && currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }

            // Stop listening while AI is speaking to prevent recording AI's voice
            const wasListening = voiceState.isListening;
            if (wasListening) {
                // Temporarily disable auto-restart
                const previousRestartSetting = shouldRestartListeningRef.current;
                shouldRestartListeningRef.current = false;
                stopRecording();
                // Restore the restart setting for after speech ends
                shouldRestartListeningRef.current = previousRestartSetting;
            }

            setVoiceState(prev => ({ ...prev, isSpeaking: true }));

            const response = await apiClient.post('/aidoc/voice/speak', {
                text,
                voice: settings.voice || 'alloy',
                speed: settings.speed || 1.0,
            }, {
                responseType: 'blob',
            });

            const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            currentAudioRef.current = audio;

            audio.onended = () => {
                setVoiceState(prev => ({ ...prev, isSpeaking: false }));
                URL.revokeObjectURL(audioUrl);
                currentAudioRef.current = null;

                // Resume listening after speaking in continuous mode
                if (shouldRestartListeningRef.current && !settings.pushToTalk) {
                    setTimeout(() => startRecording(), 500);
                }
            };

            audio.onerror = (error) => {
                console.error('Audio playback error:', error);
                setVoiceState(prev => ({ ...prev, isSpeaking: false }));
                URL.revokeObjectURL(audioUrl);
                currentAudioRef.current = null;

                // Resume listening after error in continuous mode
                if (shouldRestartListeningRef.current && !settings.pushToTalk) {
                    setTimeout(() => startRecording(), 500);
                }
            };

            await audio.play();
        } catch (error: any) {
            console.error('OpenAI TTS error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to generate speech';
            setVoiceState(prev => ({ ...prev, error: errorMessage, isSpeaking: false }));
            onError?.(errorMessage);

            // Resume listening after error in continuous mode
            if (shouldRestartListeningRef.current && !settings.pushToTalk) {
                setTimeout(() => startRecording(), 500);
            }
        }
    }, [settings, voiceState.isListening, onError, startRecording, stopRecording]);

    // Toggle listening
    const toggleListening = useCallback(() => {
        if (voiceState.isListening) {
            // Stop listening - disable auto-restart
            shouldRestartListeningRef.current = false;
            stopRecording();
        } else {
            // Start listening - enable auto-restart in continuous mode
            shouldRestartListeningRef.current = !settings.pushToTalk;
            startRecording();
        }
    }, [voiceState.isListening, settings.pushToTalk, startRecording, stopRecording]);

    // Stop speaking
    const stopSpeaking = useCallback(() => {
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }
        setVoiceState(prev => ({ ...prev, isSpeaking: false }));
    }, []);

    // Update settings
    const updateSettings = useCallback((newSettings: Partial<VoiceSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            // Cleanup recording
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }

            // Cleanup timers
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
        };
    }, []);

    return {
        voiceState,
        settings,
        toggleListening,
        speak,
        stopSpeaking,
        updateSettings,
    };
};

