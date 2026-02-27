import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import {
    ExpoSpeechRecognitionModule,
    RecognizerIntentExtraLanguageModel,
    type ExpoSpeechRecognitionErrorEvent,
    type ExpoSpeechRecognitionOptions,
    type ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';

export type SpeechRecognitionResult = {
    text: string;
    confidence: number;
    isFinal: boolean;
};

export type SpeechRecognitionError = {
    code: number;
    message: string;
};

export type WakeWordDetectionResult = {
    detected: boolean;
    wakeWord: string | null;
    confidence: number;
};

export type TTSState = 'idle' | 'speaking' | 'paused';

type RecognitionMode = 'single' | 'continuous' | null;

let onRecognitionResult: ((result: SpeechRecognitionResult) => void) | null = null;
let onRecognitionError: ((error: SpeechRecognitionError) => void) | null = null;
let onWakeWordDetected: (() => void) | null = null;
let onTTSStart: (() => void) | null = null;
let onTTSComplete: (() => void) | null = null;
let onTTSError: ((error: string) => void) | null = null;

let isInitialized = false;
let isListening = false;
let isContinuousListeningEnabled = false;
let activeRecognitionMode: RecognitionMode = null;
let autoRestartContinuous = false;
let appState = AppState.currentState;
let appStateSubscription: { remove: () => void } | null = null;
let initializationPromise: Promise<boolean> | null = null;
let listeners: Array<{ remove: () => void }> = [];
let restartTimer: ReturnType<typeof setTimeout> | null = null;
let continuousRestartAttempts = 0;
let currentTTSRequestId = 0;
let ttsActive = false;
let hasResultInCurrentSession = false;

const MAX_CONTINUOUS_RESTARTS = 4;
const CONTINUOUS_RESTART_BASE_DELAY_MS = 250;
const RECOGNITION_LANGUAGES = ['en-IN', 'en-US'];

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
    'halo orito',
];

const CONTEXTUAL_STRINGS = [
    ...WAKE_WORDS,
    'medication',
    'reminder',
    'caregiver',
    'journal',
    'symptoms',
    'appointment',
    'alzheimer',
    'dementia',
    'namaste',
    'haan',
    'haan ji',
    'ji',
    'doctor',
    'hospital',
    'Orito',
    'Aura',
];

//------This Function handles the Has Speech Module---------
function hasSpeechModule(): boolean {
    return (
        (Platform.OS === 'android' || Platform.OS === 'ios') &&
        !!ExpoSpeechRecognitionModule &&
        typeof ExpoSpeechRecognitionModule.start === 'function'
    );
}

//------This Function handles the Clear Restart Timer---------
function clearRestartTimer() {
    if (restartTimer) {
        clearTimeout(restartTimer);
        restartTimer = null;
    }
}

//------This Function handles the Normalize Text For Wake Word---------
function normalizeTextForWakeWord(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

//------This Function handles the Should Restart After End Or Error---------
function shouldRestartAfterEndOrError(): boolean {
    return (
        autoRestartContinuous &&
        isContinuousListeningEnabled &&
        activeRecognitionMode === 'continuous' &&
        appState === 'active'
    );
}

//------This Function handles the Safe Supports On Device Recognition---------
function safeSupportsOnDeviceRecognition(): boolean {
    try {
        return !!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
    } catch {
        return false;
    }
}

//------This Function handles the Get Preferred Android Recognition Service---------
function getPreferredAndroidRecognitionService(): string | undefined {
    if (Platform.OS !== 'android') {
        return undefined;
    }

    try {
        const services = ExpoSpeechRecognitionModule.getSpeechRecognitionServices?.() || [];
        if (services.includes('com.google.android.as')) {
            return 'com.google.android.as';
        }
        if (services.includes('com.google.android.googlequicksearchbox')) {
            return 'com.google.android.googlequicksearchbox';
        }
        const fallback = ExpoSpeechRecognitionModule.getDefaultRecognitionService?.();
        if (fallback?.packageName) {
            return fallback.packageName;
        }
    } catch {
        return undefined;
    }

    return undefined;
}

//------This Function handles the Build Recognition Options---------
function buildRecognitionOptions(
    continuous: boolean,
    recognitionLanguage: string
): ExpoSpeechRecognitionOptions {
    const useOnDevice = safeSupportsOnDeviceRecognition();
    const androidRecognitionServicePackage = getPreferredAndroidRecognitionService();

    return {
        lang: recognitionLanguage,
        interimResults: true,
        continuous,
        maxAlternatives: 3,
        contextualStrings: CONTEXTUAL_STRINGS,
        addsPunctuation: true,
        requiresOnDeviceRecognition: useOnDevice,
        androidRecognitionServicePackage,
        androidIntentOptions: {
            EXTRA_LANGUAGE_MODEL: RecognizerIntentExtraLanguageModel.LANGUAGE_MODEL_WEB_SEARCH,
            EXTRA_ENABLE_BIASING_DEVICE_CONTEXT: true,
            EXTRA_PREFER_OFFLINE: useOnDevice,
            EXTRA_MASK_OFFENSIVE_WORDS: false,
        },
    };
}

//------This Function handles the Ensure Permissions---------
async function ensurePermissions(): Promise<boolean> {
    try {
        const currentPermissions = await ExpoSpeechRecognitionModule.getPermissionsAsync();
        if (currentPermissions.granted) {
            return true;
        }

        const requestedPermissions = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        return !!requestedPermissions.granted;
    } catch (error) {
        console.error('[NativeSpeech] Failed to request permissions:', error);
        return false;
    }
}

//------This Function handles the Schedule Continuous Restart---------
function scheduleContinuousRestart() {
    if (!shouldRestartAfterEndOrError()) {
        return;
    }

    if (continuousRestartAttempts >= MAX_CONTINUOUS_RESTARTS) {
        return;
    }

    clearRestartTimer();
    const delay = CONTINUOUS_RESTART_BASE_DELAY_MS * Math.pow(2, continuousRestartAttempts);
    continuousRestartAttempts += 1;

    restartTimer = setTimeout(() => {
        restartTimer = null;
        void startSession('continuous');
    }, delay);
}

//------This Function handles the Handle Result Event---------
function handleResultEvent(event: ExpoSpeechRecognitionResultEvent) {
    const candidates = (event.results || []).filter(
        (result) => typeof result?.transcript === 'string' && result.transcript.trim().length > 0
    );
    if (candidates.length === 0) {
        return;
    }

    //------This Function handles the Wake Word Candidate---------
    const wakeWordCandidate = candidates.find((result) => detectWakeWordInText(result.transcript).detected);
    //------This Function handles the Best Result---------
    const bestResult = candidates.reduce((best, current) => {
        const bestConfidence = typeof best.confidence === 'number' ? best.confidence : -1;
        const currentConfidence = typeof current.confidence === 'number' ? current.confidence : -1;
        return currentConfidence > bestConfidence ? current : best;
    }, candidates[0]);
    const transcript = ((wakeWordCandidate || bestResult)?.transcript || '').trim();

    if (!transcript) {
        return;
    }
    hasResultInCurrentSession = true;

    const confidence = typeof bestResult?.confidence === 'number'
        ? bestResult.confidence
        : -1;

    if (activeRecognitionMode === 'continuous' && event.isFinal) {
        const wakeWordResult = detectWakeWordInText(transcript);
        if (wakeWordResult.detected && onWakeWordDetected) {
            onWakeWordDetected();
            return;
        }
    }

    if (onRecognitionResult) {
        onRecognitionResult({
            text: transcript,
            confidence,
            isFinal: event.isFinal,
        });
    }
}

//------This Function handles the Handle Error Event---------
function handleErrorEvent(event: ExpoSpeechRecognitionErrorEvent) {
    isListening = false;

    const errorCode = typeof event.code === 'number' ? event.code : -1;
    const message = event.message || event.error || 'Speech recognition error';

    if (onRecognitionError) {
        onRecognitionError({
            code: errorCode,
            message,
        });
    }

    const isRecoverable =
        event.error === 'no-speech' ||
        event.error === 'network' ||
        event.error === 'speech-timeout';

    if (isRecoverable && shouldRestartAfterEndOrError()) {
        scheduleContinuousRestart();
    }
}

//------This Function handles the Remove All Listeners---------
function removeAllListeners() {
    for (const listener of listeners) {
        listener.remove();
    }
    listeners = [];
}

//------This Function handles the Start Session---------
async function startSession(mode: Exclude<RecognitionMode, null>): Promise<boolean> {
    if (!isNativeSpeechAvailable()) {
        return false;
    }

    const hasPermissions = await ensurePermissions();
    if (!hasPermissions) {
        return false;
    }

    clearRestartTimer();
    activeRecognitionMode = mode;
    autoRestartContinuous = mode === 'continuous';
    hasResultInCurrentSession = false;

    let lastError: unknown = null;
    for (const recognitionLanguage of RECOGNITION_LANGUAGES) {
        try {
            ExpoSpeechRecognitionModule.start(
                buildRecognitionOptions(mode === 'continuous', recognitionLanguage)
            );
            isListening = true;
            if (mode === 'continuous') {
                continuousRestartAttempts = 0;
            }
            return true;
        } catch (error) {
            lastError = error;
        }
    }

    console.error('[NativeSpeech] Failed to start recognition session:', lastError);
    isListening = false;
    return false;
}

//------This Function handles the Handle App State Change---------
function handleAppStateChange(nextAppState: AppStateStatus): void {
    appState = nextAppState;

    if (nextAppState === 'active') {
        if (isContinuousListeningEnabled && activeRecognitionMode === 'continuous' && !isListening) {
            void startSession('continuous');
        }
        return;
    }

    void stopListening();
}

//------This Function handles the Initialize Native Speech---------
export async function initializeNativeSpeech(): Promise<boolean> {
    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = new Promise<boolean>(async (resolve) => {
        try {
            if (!hasSpeechModule()) {
                resolve(false);
                return;
            }

            if (isInitialized) {
                resolve(true);
                return;
            }

            listeners.push(
                ExpoSpeechRecognitionModule.addListener('start', () => {
                    isListening = true;
                })
            );
            listeners.push(
                ExpoSpeechRecognitionModule.addListener('end', () => {
                    const endedMode = activeRecognitionMode;
                    isListening = false;
                    if (endedMode === 'single' && !hasResultInCurrentSession && onRecognitionError) {
                        onRecognitionError({
                            code: -1,
                            message: 'Recognition ended without speech',
                        });
                    }
                    scheduleContinuousRestart();
                })
            );
            listeners.push(
                ExpoSpeechRecognitionModule.addListener('result', (event) => {
                    handleResultEvent(event);
                })
            );
            listeners.push(
                ExpoSpeechRecognitionModule.addListener('error', (event) => {
                    handleErrorEvent(event);
                })
            );

            try {
                const savedPref = await AsyncStorage.getItem('orito_continuous_listening');
                isContinuousListeningEnabled = savedPref === 'true';
            } catch {
                isContinuousListeningEnabled = false;
            }

            appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
            isInitialized = true;
            resolve(true);
        } catch (error) {
            console.error('[NativeSpeech] Initialization failed:', error);
            resolve(false);
        }
    });

    return initializationPromise;
}

//------This Function handles the Is Native Speech Available---------
export function isNativeSpeechAvailable(): boolean {
    return hasSpeechModule() && isInitialized && !!ExpoSpeechRecognitionModule.isRecognitionAvailable();
}

//------This Function handles the Start Recognition---------
export async function startRecognition(): Promise<boolean> {
    return startSession('single');
}

//------This Function handles the Stop Recognition---------
export async function stopRecognition(): Promise<void> {
    autoRestartContinuous = false;
    activeRecognitionMode = null;
    clearRestartTimer();

    if (!isNativeSpeechAvailable()) {
        return;
    }

    try {
        ExpoSpeechRecognitionModule.stop();
    } catch {
        ExpoSpeechRecognitionModule.abort();
    } finally {
        isListening = false;
    }
}

//------This Function handles the Start Continuous Listening---------
export async function startContinuousListening(): Promise<boolean> {
    isContinuousListeningEnabled = true;
    return startSession('continuous');
}

//------This Function handles the Stop Continuous Listening---------
export async function stopContinuousListening(): Promise<void> {
    isContinuousListeningEnabled = false;
    autoRestartContinuous = false;
    activeRecognitionMode = null;
    clearRestartTimer();

    if (!isNativeSpeechAvailable()) {
        return;
    }

    try {
        ExpoSpeechRecognitionModule.abort();
    } catch {
        ExpoSpeechRecognitionModule.stop();
    } finally {
        isListening = false;
    }
}

//------This Function handles the Stop Listening---------
export async function stopListening(): Promise<void> {
    autoRestartContinuous = false;
    activeRecognitionMode = null;
    clearRestartTimer();

    if (!isNativeSpeechAvailable()) {
        return;
    }

    try {
        ExpoSpeechRecognitionModule.abort();
    } catch {
        ExpoSpeechRecognitionModule.stop();
    } finally {
        isListening = false;
    }
}

//------This Function handles the Is Currently Listening---------
export function isCurrentlyListening(): boolean {
    return isListening;
}

//------This Function handles the Set Continuous Listening Enabled---------
export async function setContinuousListeningEnabled(enabled: boolean): Promise<void> {
    isContinuousListeningEnabled = enabled;

    try {
        await AsyncStorage.setItem('orito_continuous_listening', enabled.toString());
    } catch {
    }

    if (enabled && isInitialized) {
        await startContinuousListening();
        return;
    }

    await stopContinuousListening();
}

//------This Function handles the Is Continuous Listening Enabled Fn---------
export function isContinuousListeningEnabledFn(): boolean {
    return isContinuousListeningEnabled;
}

//------This Function handles the Speak---------
export async function speak(
    text: string,
    options?: {
        pitch?: number;
        rate?: number;
        language?: string;
    }
): Promise<void> {
    const pitch = options?.pitch ?? 1.0;
    const rate = options?.rate ?? 1.0;
    const language = options?.language ?? 'en-US';
    const requestId = ++currentTTSRequestId;
    ttsActive = true;
    onTTSStart?.();

    return new Promise((resolve) => {
        //------This Function handles the Finalize---------
        const finalize = () => {
            if (requestId !== currentTTSRequestId) {
                resolve();
                return;
            }
            ttsActive = false;
            onTTSComplete?.();
            resolve();
        };

        Speech.stop();
        Speech.speak(text, {
            language,
            pitch,
            rate,
            onDone: finalize,
            onStopped: finalize,
            onError: (error) => {
                onTTSError?.(String(error));
                finalize();
            },
        });
    });
}

//------This Function handles the Stop Speaking---------
export async function stopSpeaking(): Promise<void> {
    currentTTSRequestId += 1;
    if (ttsActive) {
        ttsActive = false;
        onTTSComplete?.();
    }
    Speech.stop();
}

//------This Function handles the Is Speaking---------
export async function isSpeaking(): Promise<boolean> {
    try {
        return await Speech.isSpeakingAsync();
    } catch {
        return false;
    }
}

//------This Function handles the Set Recognition Result Callback---------
export function setRecognitionResultCallback(callback: (result: SpeechRecognitionResult) => void): void {
    onRecognitionResult = callback;
}

//------This Function handles the Set Recognition Error Callback---------
export function setRecognitionErrorCallback(callback: (error: SpeechRecognitionError) => void): void {
    onRecognitionError = callback;
}

//------This Function handles the Set Wake Word Callback---------
export function setWakeWordCallback(callback: () => void): void {
    onWakeWordDetected = callback;
}

//------This Function handles the Set Tts Callbacks---------
export function setTTSCallbacks(
    onStart?: () => void,
    onComplete?: () => void,
    onError?: (error: string) => void
): void {
    onTTSStart = onStart ?? null;
    onTTSComplete = onComplete ?? null;
    onTTSError = onError ?? null;
}

//------This Function handles the Detect Wake Word In Text---------
export function detectWakeWordInText(text: string): WakeWordDetectionResult {
    const normalized = normalizeTextForWakeWord(text);
    if (!normalized) {
        return { detected: false, wakeWord: null, confidence: 0 };
    }

    for (const wakeWord of WAKE_WORDS) {
        if (normalized.includes(wakeWord)) {
            return {
                detected: true,
                wakeWord,
                confidence: 1.0,
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
    const normalized = normalizeTextForWakeWord(text);

    for (const wakeWord of WAKE_WORDS) {
        const wakeWordIndex = normalized.indexOf(wakeWord);
        if (wakeWordIndex !== -1) {
            const originalLower = text.toLowerCase();
            const rawIndex = originalLower.indexOf(wakeWord);
            if (rawIndex === -1) {
                break;
            }
            const command = text.substring(rawIndex + wakeWord.length).trim();
            return command.replace(/^[^a-zA-Z0-9]+/, '');
        }
    }

    return text.trim();
}

//------This Function handles the Cleanup---------
export function cleanup(): void {
    autoRestartContinuous = false;
    activeRecognitionMode = null;
    clearRestartTimer();

    if (appStateSubscription) {
        appStateSubscription.remove();
        appStateSubscription = null;
    }

    removeAllListeners();
    void stopListening();
    Speech.stop();

    isInitialized = false;
    initializationPromise = null;
}

export default {
    initialize: initializeNativeSpeech,
    isAvailable: isNativeSpeechAvailable,
    startRecognition,
    stopRecognition,
    startContinuousListening,
    stopContinuousListening,
    stopListening,
    isCurrentlyListening,
    setContinuousListeningEnabled,
    isContinuousListeningEnabled: isContinuousListeningEnabledFn,
    speak,
    stopSpeaking,
    isSpeaking,
    setRecognitionResultCallback,
    setRecognitionErrorCallback,
    setWakeWordCallback,
    setTTSCallbacks,
    detectWakeWordInText,
    extractCommandAfterWakeWord,
    cleanup,
};
