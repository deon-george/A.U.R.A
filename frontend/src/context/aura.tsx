import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
    getAutoConnectModule,
    saveAutoConnectModule,
    clearAutoConnectModule,
    isAutoConnectEnabled,
    incrementFacesRecognized,
    getModuleSettings,
    saveModuleSettings,
    ModuleSettings,
} from '../services/moduleStats';
import { verifyAuraModule } from '../services/aura-discovery';

interface AuraDevice {
    ip: string;
    port: number;
    sendCommand: (command: string, params?: any) => Promise<any>;
}

interface AuraState {
    isConnected: boolean;
    moduleIp: string;
    modulePort: number;
    device: AuraDevice | null;
    isAutoConnecting: boolean;
    autoConnectMessage: string;
    setConnection: (ip: string, port: number) => Promise<boolean>;
    disconnect: () => void;
    requestIdentification: () => Promise<{ person?: any } | null>;
    tryAutoConnect: () => Promise<boolean>;
    enableAutoConnect: (enabled: boolean) => Promise<void>;
    getSettings: () => Promise<ModuleSettings>;
    updateSettings: (settings: Partial<ModuleSettings>) => Promise<void>;
}

const AuraContext = createContext<AuraState>({
    isConnected: false,
    moduleIp: '',
    modulePort: 8001,
    device: null,
    isAutoConnecting: false,
    autoConnectMessage: '',
    setConnection: async () => false,
    disconnect: () => { },
    requestIdentification: async () => null,
    tryAutoConnect: async () => false,
    enableAutoConnect: async () => { },
    getSettings: async () => ({ faceRecognitionEnabled: true, voiceResponseEnabled: true, autoConnectEnabled: false }),
    updateSettings: async () => { },
});

//------This Function handles the Aura Provider---------
export function AuraProvider({ children }: { children: ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [moduleIp, setModuleIp] = useState('');
    const [modulePort, setModulePort] = useState(8001);
    const [device, setDevice] = useState<AuraDevice | null>(null);
    const [isAutoConnecting, setIsAutoConnecting] = useState(false);
    const [autoConnectMessage, setAutoConnectMessage] = useState('');

    useEffect(() => {
        attemptAutoConnect();
    }, []);

    //------This Function handles the Attempt Auto Connect---------
    async function attemptAutoConnect(): Promise<boolean> {
        try {
            const autoConnectEnabled = await isAutoConnectEnabled();
            if (!autoConnectEnabled) {
                return false;
            }

            const savedModule = await getAutoConnectModule();
            if (!savedModule) {
                return false;
            }

            setIsAutoConnecting(true);
            setAutoConnectMessage('Connecting to Aura...');

            const verified = await verifyAuraModule(savedModule.ip, savedModule.port);
            if (verified) {
                await setConnection(savedModule.ip, savedModule.port);
                setAutoConnectMessage('Connected to Aura!');
                setTimeout(() => {
                    setIsAutoConnecting(false);
                    setAutoConnectMessage('');
                }, 1500);
                return true;
            } else {
                setAutoConnectMessage('Aura module not found');
                setTimeout(() => {
                    setIsAutoConnecting(false);
                    setAutoConnectMessage('');
                }, 2000);
                return false;
            }
        } catch (error) {
            console.error('[Aura] Auto-connect failed:', error);
            setIsAutoConnecting(false);
            setAutoConnectMessage('');
            return false;
        }
    }

    //------This Function handles the Set Connection---------
    async function setConnection(ip: string, port: number): Promise<boolean> {
        try {
            setModuleIp(ip);
            setModulePort(port);
            setIsConnected(true);

            const newDevice: AuraDevice = {
                ip,
                port,
                sendCommand: async (command: string, params?: any) => {
                    try {
                        const response = await fetch(`http://${ip}:${port}/${command}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(params || {}),
                        });
                        return await response.json();
                    } catch (error) {
                        console.error(`[Aura] Failed to send command ${command}:`, error);
                        throw error;
                    }
                }
            };
            setDevice(newDevice);
            return true;
        } catch (error) {
            console.error('[Aura] Failed to set connection:', error);
            return false;
        }
    }

    //------This Function handles the Disconnect---------
    function disconnect() {
        setIsConnected(false);
        setModuleIp('');
        setModulePort(8001);
        setDevice(null);
    }

    //------This Function handles the Request Identification---------
    async function requestIdentification(): Promise<{ person?: any } | null> {
        if (!device) {
            console.warn('[Aura] Cannot request identification: device not connected');
            return null;
        }

        try {
            const response = await device.sendCommand('identify_person');
            await incrementFacesRecognized();
            return response;
        } catch (error) {
            console.error('[Aura] Identification request failed:', error);
            return null;
        }
    }

    //------This Function handles the Enable Auto Connect---------
    async function enableAutoConnect(enabled: boolean): Promise<void> {
        const settings = await getModuleSettings();
        settings.autoConnectEnabled = enabled;
        await saveModuleSettings(settings);

        if (enabled && isConnected && moduleIp) {
            await saveAutoConnectModule(moduleIp, modulePort);
        } else if (!enabled) {
            await clearAutoConnectModule();
        }
    }

    //------This Function handles the Get Settings---------
    async function getSettings(): Promise<ModuleSettings> {
        return getModuleSettings();
    }

    //------This Function handles the Update Settings---------
    async function updateSettings(newSettings: Partial<ModuleSettings>): Promise<void> {
        const settings = await getModuleSettings();
        const updated = { ...settings, ...newSettings };
        await saveModuleSettings(updated);

        if ('autoConnectEnabled' in newSettings) {
            if (newSettings.autoConnectEnabled && isConnected && moduleIp) {
                await saveAutoConnectModule(moduleIp, modulePort);
            } else if (!newSettings.autoConnectEnabled) {
                await clearAutoConnectModule();
            }
        }
    }

    return (
        <AuraContext.Provider value={{
            isConnected,
            moduleIp,
            modulePort,
            device,
            isAutoConnecting,
            autoConnectMessage,
            setConnection,
            disconnect,
            requestIdentification,
            tryAutoConnect: attemptAutoConnect,
            enableAutoConnect,
            getSettings,
            updateSettings,
        }}>
            {children}
        </AuraContext.Provider>
    );
}

//------This Function handles the Use Aura---------
export const useAura = () => useContext(AuraContext);
