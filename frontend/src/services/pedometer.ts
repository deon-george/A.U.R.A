import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StepData {
    date: string;
    steps: number;
    goal: number;
    lastUpdated: string;
}

export interface StepHistory {
    [date: string]: number;
}

const STEP_GOAL_DEFAULT = 5000;
const STEP_DATA_KEY = 'orito_step_data';
const STEP_HISTORY_KEY = 'orito_step_history';

let pedometerModule: any = null;
let isPedometerAvailable = false;
let stepSubscription: any = null;
let currentStepCount = 0;
let onStepUpdate: ((steps: number) => void) | null = null;
let permissionDenied = false;

//------This Function handles the Request Motion Permission---------
async function requestMotionPermission(): Promise<boolean> {
    try {
        if (pedometerModule && pedometerModule.requestPermissionsAsync) {
            const { status } = await pedometerModule.requestPermissionsAsync();
            return status === 'granted';
        }
        return true;
    } catch (error) {
        return false;
    }
}

//------This Function handles the Initialize Pedometer---------
export async function initializePedometer(): Promise<boolean> {
    try {
        const expoSensors = await import('expo-sensors');
        pedometerModule = expoSensors.Pedometer;
        
        isPedometerAvailable = await pedometerModule.isAvailableAsync();
        
        if (isPedometerAvailable) {
            const hasPermission = await requestMotionPermission();
            if (!hasPermission) {
                permissionDenied = true;
                return false;
            }
            
            permissionDenied = false;
            
            const today = new Date();
            const startOfDay = new Date(today);
            startOfDay.setHours(0, 0, 0, 0);
            
            const result = await pedometerModule.getStepCountAsync(startOfDay, today);
            currentStepCount = result.steps;
            
            await saveStepData(currentStepCount);
            
            return true;
        } else {
            return false;
        }
    } catch (error) {
        isPedometerAvailable = false;
        return false;
    }
}

//------This Function handles the Is Permission Denied---------
export function isPermissionDenied(): boolean {
    return permissionDenied;
}

//------This Function handles the Start Step Updates---------
export function startStepUpdates(callback?: (steps: number) => void): void {
    if (!isPedometerAvailable || !pedometerModule) {
        return;
    }
    
    if (stepSubscription) {
        stepSubscription.remove();
    }
    
    onStepUpdate = callback || null;
    
    stepSubscription = pedometerModule.watchStepCount((result: { steps: number }) => {
        currentStepCount += result.steps;
        saveStepData(currentStepCount).catch(() => {});
        
        if (onStepUpdate) {
            onStepUpdate(currentStepCount);
        }
    });
}

//------This Function handles the Stop Step Updates---------
export function stopStepUpdates(): void {
    if (stepSubscription) {
        stepSubscription.remove();
        stepSubscription = null;
    }
}

//------This Function handles the Is Pedometer Available Fn---------
export function isPedometerAvailableFn(): boolean {
    return isPedometerAvailable;
}

//------This Function handles the Get Today Steps---------
export async function getTodaySteps(): Promise<number> {
    if (isPedometerAvailable && pedometerModule) {
        try {
            const today = new Date();
            const startOfDay = new Date(today);
            startOfDay.setHours(0, 0, 0, 0);
            
            const result = await pedometerModule.getStepCountAsync(startOfDay, today);
            currentStepCount = result.steps;
            return currentStepCount;
        } catch (error) {
        }
    }
    
    const storedData = await loadStepData();
    return storedData?.steps || 0;
}

//------This Function handles the Get Step Data---------
export async function getStepData(): Promise<StepData> {
    const steps = await getTodaySteps();
    const today = new Date().toISOString().split('T')[0];
    
    return {
        date: today,
        steps,
        goal: STEP_GOAL_DEFAULT,
        lastUpdated: new Date().toISOString(),
    };
}

//------This Function handles the Get Step History---------
export async function getStepHistory(days: number = 7): Promise<StepHistory> {
    try {
        const stored = await AsyncStorage.getItem(STEP_HISTORY_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
    }
    
    return {};
}
//------This Function handles the Save Step Data---------
async function saveStepData(steps: number): Promise<void> {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const stepData: StepData = {
            date: today,
            steps,
            goal: STEP_GOAL_DEFAULT,
            lastUpdated: new Date().toISOString(),
        };
        await AsyncStorage.setItem(STEP_DATA_KEY, JSON.stringify(stepData));
        
        const history = await getStepHistory();
        history[today] = steps;
        await AsyncStorage.setItem(STEP_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
    }
}

//------This Function handles the Load Step Data---------
async function loadStepData(): Promise<StepData | null> {
    try {
        const stored = await AsyncStorage.getItem(STEP_DATA_KEY);
        if (stored) {
            const data: StepData = JSON.parse(stored);
            
            const today = new Date().toISOString().split('T')[0];
            if (data.date === today) {
                return data;
            }
        }
    } catch (error) {
    }
    
    return null;
}

//------This Function handles the Add Manual Steps---------
export async function addManualSteps(steps: number): Promise<void> {
    const currentSteps = await getTodaySteps();
    const newTotal = currentSteps + steps;
    await saveStepData(newTotal);
    currentStepCount = newTotal;
    
    if (onStepUpdate) {
        onStepUpdate(currentStepCount);
    }
}

//------This Function handles the Set Step Goal---------
export async function setStepGoal(goal: number): Promise<void> {
    try {
        await AsyncStorage.setItem('orito_step_goal', goal.toString());
    } catch (error) {
    }
}

//------This Function handles the Get Step Goal---------
export async function getStepGoal(): Promise<number> {
    try {
        const stored = await AsyncStorage.getItem('orito_step_goal');
        if (stored) {
            return parseInt(stored, 10);
        }
    } catch (error) {
    }
    
    return STEP_GOAL_DEFAULT;
}

//------This Function handles the Get Steps For Date---------
export async function getStepsForDate(date: Date): Promise<number> {
    if (isPedometerAvailable && pedometerModule) {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            
            const result = await pedometerModule.getStepCountAsync(startOfDay, endOfDay);
            return result.steps;
        } catch (error) {
        }
    }
    
    const history = await getStepHistory();
    const dateKey = date.toISOString().split('T')[0];
    return history[dateKey] || 0;
}

//------This Function handles the Get Step Summary---------
export async function getStepSummary(): Promise<string> {
    const stepData = await getStepData();
    const percentage = Math.round((stepData.steps / stepData.goal) * 100);
    
    let status = '';
    if (percentage >= 100) {
        status = "You've reached your daily step goal! Great job!";
    } else if (percentage >= 75) {
        status = "You're almost at your goal! Keep it up!";
    } else if (percentage >= 50) {
        status = "You're halfway to your goal. Nice progress!";
    } else if (percentage >= 25) {
        status = "Good start! Keep moving to reach your goal.";
    } else {
        status = "Time to get moving! You haven't walked much today.";
    }
    
    return `Today's steps: ${stepData.steps} out of ${stepData.goal} (${percentage}%). ${status}`;
}

//------This Function handles the Cleanup---------
export function cleanup(): void {
    stopStepUpdates();
    onStepUpdate = null;
}

export const pedometerService = {
    initialize: initializePedometer,
    startUpdates: startStepUpdates,
    stopUpdates: stopStepUpdates,
    isAvailable: isPedometerAvailableFn,
    isPermissionDenied,
    getTodaySteps,
    getStepData,
    getStepHistory,
    addManualSteps,
    setStepGoal,
    getStepGoal,
    getStepsForDate,
    getStepSummary,
    cleanup,
};

export default pedometerService;
