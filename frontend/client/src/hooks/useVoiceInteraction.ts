import { useState, useRef, useEffect, useCallback } from 'react';
import apiClient from '../services/api';

export interface VoiceSettings {
    enabled: boolean;
    autoSpeak: boolean; // Auto-speak AI responses
    language: string;
    speechRate: number;
    voiceName?: string;
    pushToTalk: boolean; // If false, continuous listening
    provider: 'browser' | 'openai'; // Voice provider selection
    openaiVoice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'; // OpenAI TTS voice
    openaiSpeed?: number; // OpenAI TTS speed (0.25 - 4.0)
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
    provider: 'browser',
    openaiVoice: 'alloy',
    openaiSpeed: 1.0,
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
    const silenceTimerRef = useRef<number | null>(null);
    const restartTimerRef = useRef<number | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);

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
        }, 1500) as unknown as number;
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
        }, 300) as unknown as number;
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

    // ============================================
    // OpenAI Voice Functions (Whisper + TTS)
    // ============================================

    // OpenAI Whisper: Transcribe audio
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

    // OpenAI Whisper: Start recording audio
    const startOpenAIRecording = useCallback(async () => {
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

    // OpenAI Whisper: Stop recording audio
    const stopOpenAIRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
        setVoiceState(prev => ({ ...prev, isListening: false }));
    }, []);

    // OpenAI TTS: Speak text
    const speakWithOpenAI = useCallback(async (text: string, interrupt: boolean = false) => {
        if (!text.trim()) return;

        try {
            // Stop current audio if interrupting
            if (interrupt && currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }

            setVoiceState(prev => ({ ...prev, isSpeaking: true }));

            const response = await apiClient.post('/aidoc/voice/speak', {
                text,
                voice: settings.openaiVoice || 'alloy',
                speed: settings.openaiSpeed || 1.0,
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
                if (settings.enabled && !settings.pushToTalk && settings.provider === 'openai') {
                    setTimeout(() => startOpenAIRecording(), 500);
                }
            };

            audio.onerror = (error) => {
                console.error('Audio playback error:', error);
                setVoiceState(prev => ({ ...prev, isSpeaking: false }));
                URL.revokeObjectURL(audioUrl);
                currentAudioRef.current = null;
            };

            await audio.play();
        } catch (error: any) {
            console.error('OpenAI TTS error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to generate speech';
            setVoiceState(prev => ({ ...prev, error: errorMessage, isSpeaking: false }));
            onError?.(errorMessage);
        }
    }, [settings, onError, startOpenAIRecording]);

    // ============================================
    // Provider-Aware Functions
    // ============================================

    // Toggle listening (provider-aware)
    const toggleListening = useCallback(() => {
        if (voiceState.isListening) {
            if (settings.provider === 'openai') {
                stopOpenAIRecording();
            } else {
                stopListening();
            }
        } else {
            if (settings.provider === 'openai') {
                startOpenAIRecording();
            } else {
                startListening();
            }
        }
    }, [voiceState.isListening, settings.provider, startListening, stopListening, startOpenAIRecording, stopOpenAIRecording]);

    // Speak text using TTS (provider-aware)
    const speak = useCallback((text: string, interrupt: boolean = false) => {
        if (!text.trim()) return;

        // Use OpenAI TTS if provider is set to openai
        if (settings.provider === 'openai') {
            speakWithOpenAI(text, interrupt);
            return;
        }

        // Browser TTS (original implementation)
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
    }, [settings, availableVoices, voiceState.isListening, startListening, stopListening, speakWithOpenAI]);

    // Stop speaking (provider-aware)
    const stopSpeaking = useCallback(() => {
        // Stop browser TTS
        window.speechSynthesis.cancel();

        // Stop OpenAI TTS
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
            // Cleanup browser voice
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
            window.speechSynthesis.cancel();

            // Cleanup OpenAI voice
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
            if (restartTimerRef.current) {
                clearTimeout(restartTimerRef.current);
            }
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

