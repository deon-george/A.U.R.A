import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export interface Preferences {
    theme: 'system' | 'light' | 'dark';
    fontSize: 'small' | 'medium' | 'large';
    fontScale: number;
}

interface PreferencesContextType extends Preferences {
    setTheme: (theme: Preferences['theme']) => Promise<void>;
    setFontSize: (size: Preferences['fontSize']) => Promise<void>;
    loading: boolean;
}

const DEFAULT_PREFERENCES: Preferences = {
    theme: 'dark',
    fontSize: 'medium',
    fontScale: 1.0,
};

const PreferencesContext = createContext<PreferencesContextType>({
    ...DEFAULT_PREFERENCES,
    setTheme: async () => { },
    setFontSize: async () => { },
    loading: true,
});

//------This Function handles the Preferences Provider---------
export function PreferencesProvider({ children }: { children: ReactNode }) {
    const systemColorScheme = useColorScheme();
    const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPreferences();
    }, []);

    //------This Function handles the Load Preferences---------
    async function loadPreferences() {
        try {
            const stored = await AsyncStorage.getItem('app_preferences');
            if (stored) {
                setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(stored) });
            }
        } catch (error) {
            console.error('Failed to load preferences:', error);
        } finally {
            setLoading(false);
        }
    }

    //------This Function handles the Save Preferences---------
    async function savePreferences(newPreferences: Preferences) {
        try {
            await AsyncStorage.setItem('app_preferences', JSON.stringify(newPreferences));
            setPreferences(newPreferences);
        } catch (error) {
            console.error('Failed to save preferences:', error);
        }
    }

    //------This Function handles the Set Theme---------
    async function setTheme(theme: Preferences['theme']) {
        await savePreferences({ ...preferences, theme });
    }

    //------This Function handles the Set Font Size---------
    async function setFontSize(fontSize: Preferences['fontSize']) {
        let fontScale = 1.0;
        switch (fontSize) {
            case 'small': fontScale = 0.85; break;
            case 'large': fontScale = 1.15; break;
            default: fontScale = 1.0;
        }
        await savePreferences({ ...preferences, fontSize, fontScale });
    }

    return (
        <PreferencesContext.Provider value={{
            ...preferences,
            setTheme,
            setFontSize,
            loading,
        }}>
            {children}
        </PreferencesContext.Provider>
    );
}

//------This Function handles the Use Preferences---------
export const usePreferences = () => useContext(PreferencesContext);
