import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SpeechRecognitionResult = {
    text: string;
    confidence: number;
    isFinal: boolean;
};

export type WakeWordDetectionResult = {
    detected: boolean;
    wakeWord: string | null;
    confidence: number;
};

const WAKE_WORDS = [
    'hey orito', 
    'hello orito', 
    'hi orito', 
    'orito',
    'hai orito', 
    'hey oriyto',
    'hello oriyto',
    'hero tto', 
    'zero tto', 
    'orito o rito',
    'hello orita',
    'hey orita',
    'hello oreto',
    'hey oreto',
    'hello areeto',
    'halo orito'
];
const WAKE_WORD_THRESHOLD = 0.75;

let onRecognitionResult: ((result: SpeechRecognitionResult) => void) | null = null;
let onTTSComplete: (() => void) | null = null;

//------This Function handles the Initialize Fallback Speech---------
export async function initializeFallbackSpeech(): Promise<boolean> {
    console.log('[FallbackSpeech] Initialized with expo-speech');
    return true;
}

//------This Function handles the Is Fallback Available---------
export function isFallbackAvailable(): boolean {
    return true;
}

//------This Function handles the Speak Text---------
export async function speakText(
    text: string,
    options?: {
        pitch?: number;
        rate?: number;
        language?: string;
    }
): Promise<void> {
    const pitch = options?.pitch ?? 1.0;
    const rate = options?.rate ?? 1.0;
    const language = options?.language ?? 'en';

    return new Promise((resolve, reject) => {
        Speech.speak(text, {
            language,
            pitch,
            rate,
            onDone: () => {
                if (onTTSComplete) onTTSComplete();
                resolve();
            },
            onError: (error) => {
                console.log('[FallbackSpeech] TTS error:', error);
                resolve();
            },
        });
    });
}

//------This Function handles the Stop Speaking---------
export async function stopSpeaking(): Promise<void> {
    Speech.stop();
}

//------This Function handles the Is Speaking---------
export async function isSpeaking(): Promise<boolean> {
    return false;
}

//------This Function handles the Set Recognition Result Callback---------
export function setRecognitionResultCallback(
    callback: (result: SpeechRecognitionResult) => void
): void {
    onRecognitionResult = callback;
}

//------This Function handles the Set Tts Complete Callback---------
export function setTTSCompleteCallback(callback: () => void): void {
    onTTSComplete = callback;
}

//------This Function handles the Detect Wake Word In Text---------
export function detectWakeWordInText(text: string): WakeWordDetectionResult {
    const lowerText = text.toLowerCase().trim();

    for (const wakeWord of WAKE_WORDS) {
        if (lowerText.includes(wakeWord)) {
            const wakeWordIndex = lowerText.indexOf(wakeWord);
            const isAtStart = wakeWordIndex === 0;
            const isExactMatch = lowerText === wakeWord || lowerText.startsWith(wakeWord + ' ');
            
            const confidence = isExactMatch ? 0.95 : (isAtStart ? 0.85 : 0.75);
            
            return {
                detected: confidence >= WAKE_WORD_THRESHOLD,
                wakeWord,
                confidence,
            };
        }
    }

    return {
        detected: false,
        wakeWord: null,
        confidence: 0,
    };
}

//------This Function handles the Extract Command After Wake Word---------
export function extractCommandAfterWakeWord(text: string): string {
    const lowerText = text.toLowerCase().trim();

    for (const wakeWord of WAKE_WORDS) {
        const index = lowerText.indexOf(wakeWord);
        if (index !== -1) {
            const afterWakeWord = text.substring(index + wakeWord.length).trim();
            return afterWakeWord;
        }
    }

    return text;
}

//------This Function handles the Get Available Voices---------
export async function getAvailableVoices(): Promise<Array<{ id: string; name: string; language: string }>> {
    return [
        { id: 'en-us', name: 'English (US)', language: 'en-US' },
        { id: 'en-gb', name: 'English (UK)', language: 'en-GB' },
    ];
}

//------This Function handles the Process Transcription Result---------
export function processTranscriptionResult(text: string, confidence: number = 0.9): void {
    if (onRecognitionResult) {
        onRecognitionResult({
            text,
            confidence,
            isFinal: true,
        });
    }
}

//------This Function handles the Cleanup Fallback Speech---------
export function cleanupFallbackSpeech(): void {
    Speech.stop();
    onRecognitionResult = null;
    onTTSComplete = null;
}

export const fallbackSpeechService = {
    initialize: initializeFallbackSpeech,
    isAvailable: isFallbackAvailable,
    speak: speakText,
    stopSpeaking,
    isSpeaking,
    setRecognitionResultCallback,
    setTTSCompleteCallback,
    detectWakeWord: detectWakeWordInText,
    extractCommand: extractCommandAfterWakeWord,
    getAvailableVoices,
    processTranscriptionResult,
    cleanup: cleanupFallbackSpeech,
};

export default fallbackSpeechService;
