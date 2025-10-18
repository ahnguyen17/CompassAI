import { useState, useRef, useEffect, useCallback } from 'react';

export interface VoiceSettings {
    enabled: boolean;
    autoSpeak: boolean; // Auto-speak AI responses
    language: string;
    speechRate: number;
    voiceName?: string;
    pushToTalk: boolean; // If false, continuous listening
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
    speechRate: 1.0,
    pushToTalk: false,
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

    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const restartTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Load available voices
    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            setAvailableVoices(voices);
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    // Save settings to localStorage
    useEffect(() => {
        localStorage.setItem('aiDocVoiceSettings', JSON.stringify(settings));
    }, [settings]);

    // Initialize Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('Speech Recognition API not supported');
            return;
        }

        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = !settings.pushToTalk;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = settings.language;
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onstart = () => {
            console.log('Speech recognition started');
            setVoiceState(prev => ({ ...prev, isListening: true, error: null }));
        };

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            setVoiceState(prev => ({
                ...prev,
                interimTranscript: interimTranscript.trim(),
            }));

            if (finalTranscript) {
                const fullTranscript = finalTranscript.trim();
                console.log('Final transcript:', fullTranscript);
                
                setVoiceState(prev => ({
                    ...prev,
                    transcript: fullTranscript,
                    interimTranscript: '',
                }));

                // In push-to-talk mode, send immediately
                if (settings.pushToTalk) {
                    onTranscriptComplete(fullTranscript);
                    setVoiceState(prev => ({ ...prev, transcript: '' }));
                } else {
                    // In continuous mode, wait for silence before sending
                    resetSilenceTimer(fullTranscript);
                }
            }
        };

        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
            
            let errorMessage = 'Speech recognition error';
            switch (event.error) {
                case 'not-allowed':
                case 'service-not-allowed':
                    errorMessage = 'Microphone access denied. Please allow microphone access.';
                    break;
                case 'no-speech':
                    errorMessage = 'No speech detected. Please try again.';
                    break;
                case 'audio-capture':
                    errorMessage = 'No microphone found. Please check your device.';
                    break;
                case 'network':
                    errorMessage = 'Network error. Please check your connection.';
                    break;
            }

            setVoiceState(prev => ({ ...prev, error: errorMessage, isListening: false }));
            onError?.(errorMessage);
        };

        recognitionRef.current.onend = () => {
            console.log('Speech recognition ended');
            setVoiceState(prev => {
                // If we're in continuous mode and still enabled, restart
                if (settings.enabled && !settings.pushToTalk && prev.isListening) {
                    restartRecognition();
                    return prev;
                }
                return { ...prev, isListening: false };
            });
        };

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [settings.language, settings.pushToTalk, settings.enabled, onTranscriptComplete, onError]);

    // Silence detection timer
    const resetSilenceTimer = useCallback((transcript: string) => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }

        // Wait 1.5 seconds of silence before sending
        silenceTimerRef.current = setTimeout(() => {
            if (transcript.trim()) {
                onTranscriptComplete(transcript);
                setVoiceState(prev => ({ ...prev, transcript: '' }));
            }
        }, 1500);
    }, [onTranscriptComplete]);

    // Restart recognition after a brief delay
    const restartRecognition = useCallback(() => {
        if (restartTimerRef.current) {
            clearTimeout(restartTimerRef.current);
        }

        restartTimerRef.current = setTimeout(() => {
            if (recognitionRef.current && settings.enabled && !settings.pushToTalk) {
                try {
                    recognitionRef.current.start();
                } catch (err) {
                    console.error('Error restarting recognition:', err);
                }
            }
        }, 300);
    }, [settings.enabled, settings.pushToTalk]);

    // Start listening
    const startListening = useCallback(() => {
        if (!recognitionRef.current) {
            const error = 'Speech recognition not supported';
            setVoiceState(prev => ({ ...prev, error }));
            onError?.(error);
            return;
        }

        try {
            recognitionRef.current.start();
        } catch (err) {
            console.error('Error starting recognition:', err);
            setVoiceState(prev => ({ ...prev, error: 'Failed to start listening' }));
        }
    }, [onError]);

    // Stop listening
    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
        if (restartTimerRef.current) {
            clearTimeout(restartTimerRef.current);
        }
    }, []);

    // Toggle listening
    const toggleListening = useCallback(() => {
        if (voiceState.isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [voiceState.isListening, startListening, stopListening]);

    // Speak text using TTS
    const speak = useCallback((text: string, interrupt: boolean = false) => {
        if (!text.trim()) return;

        // Stop current speech if interrupting
        if (interrupt && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = settings.language;
        utterance.rate = settings.speechRate;

        // Set voice if specified
        if (settings.voiceName) {
            const voice = availableVoices.find(v => v.name === settings.voiceName);
            if (voice) {
                utterance.voice = voice;
            }
        }

        utterance.onstart = () => {
            setVoiceState(prev => ({ ...prev, isSpeaking: true }));
            // Pause listening while speaking
            if (voiceState.isListening && !settings.pushToTalk) {
                stopListening();
            }
        };

        utterance.onend = () => {
            setVoiceState(prev => ({ ...prev, isSpeaking: false }));
            // Resume listening after speaking in continuous mode
            if (settings.enabled && !settings.pushToTalk) {
                setTimeout(() => startListening(), 500);
            }
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            setVoiceState(prev => ({ ...prev, isSpeaking: false }));
        };

        synthesisRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [settings, availableVoices, voiceState.isListening, startListening, stopListening]);

    // Stop speaking
    const stopSpeaking = useCallback(() => {
        window.speechSynthesis.cancel();
        setVoiceState(prev => ({ ...prev, isSpeaking: false }));
    }, []);

    // Update settings
    const updateSettings = useCallback((newSettings: Partial<VoiceSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
            if (restartTimerRef.current) {
                clearTimeout(restartTimerRef.current);
            }
            window.speechSynthesis.cancel();
        };
    }, []);

    return {
        voiceState,
        settings,
        availableVoices,
        startListening,
        stopListening,
        toggleListening,
        speak,
        stopSpeaking,
        updateSettings,
    };
};

