import AsyncStorage from '@react-native-async-storage/async-storage';

const STATS_KEY_PREFIX = 'aura_module_stats_';
const AUTO_CONNECT_KEY = 'aura_auto_connect';
const SETTINGS_KEY = 'aura_module_settings';

export interface ModuleStats {
    facesRecognized: number;
    conversations: number;
    voiceCommands: number;
    date: string;
}

export interface ModuleSettings {
    faceRecognitionEnabled: boolean;
    voiceResponseEnabled: boolean;
    autoConnectEnabled: boolean;
}

const DEFAULT_SETTINGS: ModuleSettings = {
    faceRecognitionEnabled: true,
    voiceResponseEnabled: true,
    autoConnectEnabled: false,
};

//------This Function handles the Get Today Date---------
function getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

//------This Function handles the Get Stats Key---------
function getStatsKey(date: string): string {
    return `${STATS_KEY_PREFIX}${date}`;
}

//------This Function handles the Get Stats For Date---------
export async function getStatsForDate(date: string): Promise<ModuleStats> {
    try {
        const key = getStatsKey(date);
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('[ModuleStats] Failed to get stats for date:', error);
    }

    return {
        facesRecognized: 0,
        conversations: 0,
        voiceCommands: 0,
        date,
    };
}

//------This Function handles the Get Today Stats---------
export async function getTodayStats(): Promise<ModuleStats> {
    return getStatsForDate(getTodayDate());
}

//------This Function handles the Save Stats---------
export async function saveStats(stats: ModuleStats): Promise<void> {
    try {
        const key = getStatsKey(stats.date);
        await AsyncStorage.setItem(key, JSON.stringify(stats));
    } catch (error) {
        console.error('[ModuleStats] Failed to save stats:', error);
    }
}

//------This Function handles the Increment Stat---------
export async function incrementStat(
    statType: 'facesRecognized' | 'conversations' | 'voiceCommands'
): Promise<void> {
    try {
        const today = getTodayDate();
        const stats = await getStatsForDate(today);
        stats[statType] += 1;
        await saveStats(stats);
        console.log(`[ModuleStats] Incremented ${statType}:`, stats[statType]);
    } catch (error) {
        console.error('[ModuleStats] Failed to increment stat:', error);
    }
}

//------This Function handles the Increment Faces Recognized---------
export async function incrementFacesRecognized(): Promise<void> {
    return incrementStat('facesRecognized');
}

//------This Function handles the Increment Conversations---------
export async function incrementConversations(): Promise<void> {
    return incrementStat('conversations');
}

//------This Function handles the Increment Voice Commands---------
export async function incrementVoiceCommands(): Promise<void> {
    return incrementStat('voiceCommands');
}

//------This Function handles the Get Stats For Last Days---------
export async function getStatsForLastDays(days: number): Promise<ModuleStats[]> {
    const stats: ModuleStats[] = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayStats = await getStatsForDate(dateStr);
        stats.push(dayStats);
    }

    return stats;
}

//------This Function handles the Clear Old Stats---------
export async function clearOldStats(): Promise<void> {
    try {
        const keys = await AsyncStorage.getAllKeys();
        //------This Function handles the Stats Keys---------
        const statsKeys = keys.filter(key => key.startsWith(STATS_KEY_PREFIX));

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

        //------This Function handles the Keys To Remove---------
        const keysToRemove = statsKeys.filter(key => {
            const date = key.replace(STATS_KEY_PREFIX, '');
            return date < cutoffDate;
        });

        if (keysToRemove.length > 0) {
            await AsyncStorage.multiRemove(keysToRemove);
            console.log(`[ModuleStats] Cleared ${keysToRemove.length} old stats entries`);
        }
    } catch (error) {
        console.error('[ModuleStats] Failed to clear old stats:', error);
    }
}

//------This Function handles the Get Module Settings---------
export async function getModuleSettings(): Promise<ModuleSettings> {
    try {
        const stored = await AsyncStorage.getItem(SETTINGS_KEY);
        if (stored) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        }
    } catch (error) {
        console.error('[ModuleStats] Failed to get settings:', error);
    }
    return DEFAULT_SETTINGS;
}

//------This Function handles the Save Module Settings---------
export async function saveModuleSettings(settings: ModuleSettings): Promise<void> {
    try {
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('[ModuleStats] Failed to save settings:', error);
    }
}

export async function updateSetting<K extends keyof ModuleSettings>(
    key: K,
    value: ModuleSettings[K]
): Promise<void> {
    const settings = await getModuleSettings();
    settings[key] = value;
    await saveModuleSettings(settings);
}

//------This Function handles the Is Auto Connect Enabled---------
export async function isAutoConnectEnabled(): Promise<boolean> {
    const settings = await getModuleSettings();
    return settings.autoConnectEnabled;
}

//------This Function handles the Save Auto Connect Module---------
export async function saveAutoConnectModule(ip: string, port: number): Promise<void> {
    try {
        await AsyncStorage.setItem(AUTO_CONNECT_KEY, JSON.stringify({ ip, port }));
    } catch (error) {
        console.error('[ModuleStats] Failed to save auto-connect module:', error);
    }
}

//------This Function handles the Get Auto Connect Module---------
export async function getAutoConnectModule(): Promise<{ ip: string; port: number } | null> {
    try {
        const stored = await AsyncStorage.getItem(AUTO_CONNECT_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('[ModuleStats] Failed to get auto-connect module:', error);
    }
    return null;
}

//------This Function handles the Clear Auto Connect Module---------
export async function clearAutoConnectModule(): Promise<void> {
    try {
        await AsyncStorage.removeItem(AUTO_CONNECT_KEY);
    } catch (error) {
        console.error('[ModuleStats] Failed to clear auto-connect module:', error);
    }
}
