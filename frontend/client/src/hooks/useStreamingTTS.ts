import { useRef, useCallback, useState } from 'react';
import apiClient from '../services/api';

interface StreamingTTSOptions {
    voice: string;
    speed: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: string) => void;
}

interface AudioQueueItem {
    audioUrl: string;
    text: string;
}

/**
 * Hook for streaming Text-to-Speech
 * Accumulates text chunks and sends complete sentences to TTS API
 * Queues audio segments to play sequentially without gaps
 */
export const useStreamingTTS = (options: StreamingTTSOptions) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const accumulatedTextRef = useRef<string>('');
    const audioQueueRef = useRef<AudioQueueItem[]>([]);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const isPlayingRef = useRef(false);
    const sentencesProcessedRef = useRef<Set<string>>(new Set());

    /**
     * Play the next audio in the queue
     */
    const playNextInQueue = useCallback(() => {
        if (audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            setIsSpeaking(false);
            options.onEnd?.();
            return;
        }

        const nextItem = audioQueueRef.current.shift();
        if (!nextItem) return;

        console.log('[StreamingTTS] Playing next audio chunk:', nextItem.text.substring(0, 50) + '...');

        const audio = new Audio(nextItem.audioUrl);
        currentAudioRef.current = audio;
        isPlayingRef.current = true;

        audio.onended = () => {
            console.log('[StreamingTTS] Audio chunk finished');
            URL.revokeObjectURL(nextItem.audioUrl);
            currentAudioRef.current = null;
            // Play next in queue
            playNextInQueue();
        };

        audio.onerror = (error) => {
            console.error('[StreamingTTS] Audio playback error:', error);
            URL.revokeObjectURL(nextItem.audioUrl);
            currentAudioRef.current = null;
            options.onError?.('Audio playback failed');
            // Try to play next in queue
            playNextInQueue();
        };

        audio.play().catch((error) => {
            console.error('[StreamingTTS] Error starting audio playback:', error);
            URL.revokeObjectURL(nextItem.audioUrl);
            currentAudioRef.current = null;
            options.onError?.('Failed to start audio playback');
            // Try to play next in queue
            playNextInQueue();
        });
    }, [options]);

    /**
     * Generate speech for a text chunk and add to queue
     */
    const generateAndQueueSpeech = useCallback(async (text: string) => {
        if (!text.trim()) return;

        try {
            console.log('[StreamingTTS] Generating speech for:', text.substring(0, 50) + '...');

            const response = await apiClient.post('/aidoc/voice/speak', {
                text,
                voice: options.voice,
                speed: options.speed,
            }, {
                responseType: 'blob',
            });

            const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);

            // Add to queue
            audioQueueRef.current.push({ audioUrl, text });
            console.log('[StreamingTTS] Audio queued. Queue length:', audioQueueRef.current.length);

            // If not currently playing, start playing
            if (!isPlayingRef.current) {
                console.log('[StreamingTTS] Starting playback');
                setIsSpeaking(true);
                options.onStart?.();
                playNextInQueue();
            }
        } catch (error: any) {
            console.error('[StreamingTTS] TTS generation error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to generate speech';
            options.onError?.(errorMessage);
        }
    }, [options, playNextInQueue]);

    /**
     * Extract complete sentences from accumulated text
     * Returns array of complete sentences and updates accumulated text with remainder
     */
    const extractCompleteSentences = useCallback((text: string): string[] => {
        const sentences: string[] = [];
        
        // Match sentences ending with . ! ? followed by space or end of string
        // Also handle common abbreviations (Dr. Mr. Mrs. etc.)
        const sentenceRegex = /[^.!?]+[.!?]+(?:\s|$)/g;
        const matches = text.match(sentenceRegex);

        if (matches) {
            for (const match of matches) {
                const trimmed = match.trim();
                // Only process if it's a substantial sentence (more than 10 chars)
                // and hasn't been processed before
                if (trimmed.length > 10 && !sentencesProcessedRef.current.has(trimmed)) {
                    sentences.push(trimmed);
                    sentencesProcessedRef.current.add(trimmed);
                }
            }

            // Update accumulated text to only contain the remainder
            const lastMatch = matches[matches.length - 1];
            const lastIndex = text.lastIndexOf(lastMatch) + lastMatch.length;
            accumulatedTextRef.current = text.substring(lastIndex);
        } else {
            // No complete sentences yet, keep accumulating
            accumulatedTextRef.current = text;
        }

        return sentences;
    }, []);

    /**
     * Add a text chunk to the accumulator and process complete sentences
     */
    const addChunk = useCallback((chunk: string) => {
        if (!chunk) return;

        // Add to accumulated text
        accumulatedTextRef.current += chunk;

        // Extract and process complete sentences
        const completeSentences = extractCompleteSentences(accumulatedTextRef.current);

        // Generate speech for each complete sentence
        for (const sentence of completeSentences) {
            generateAndQueueSpeech(sentence);
        }
    }, [extractCompleteSentences, generateAndQueueSpeech]);

    /**
     * Flush any remaining accumulated text (call when streaming is done)
     */
    const flush = useCallback(() => {
        const remaining = accumulatedTextRef.current.trim();
        if (remaining && !sentencesProcessedRef.current.has(remaining)) {
            console.log('[StreamingTTS] Flushing remaining text:', remaining.substring(0, 50) + '...');
            sentencesProcessedRef.current.add(remaining);
            generateAndQueueSpeech(remaining);
        }
        accumulatedTextRef.current = '';
    }, [generateAndQueueSpeech]);

    /**
     * Stop all speech and clear queue
     */
    const stop = useCallback(() => {
        console.log('[StreamingTTS] Stopping all speech');

        // Stop current audio
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }

        // Clear queue and revoke URLs
        for (const item of audioQueueRef.current) {
            URL.revokeObjectURL(item.audioUrl);
        }
        audioQueueRef.current = [];

        // Reset state
        accumulatedTextRef.current = '';
        sentencesProcessedRef.current.clear();
        isPlayingRef.current = false;
        setIsSpeaking(false);
    }, []);

    /**
     * Reset for a new streaming session
     */
    const reset = useCallback(() => {
        console.log('[StreamingTTS] Resetting for new session');
        stop();
        sentencesProcessedRef.current.clear();
    }, [stop]);

    return {
        isSpeaking,
        addChunk,
        flush,
        stop,
        reset,
    };
};

