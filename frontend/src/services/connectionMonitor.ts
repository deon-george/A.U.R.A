import { AppState, AppStateStatus } from 'react-native';
import api from './api';

type ConnectionListener = (connected: boolean, pingTime?: number) => void;

class ConnectionMonitor {
    private listeners: Set<ConnectionListener> = new Set();
    private isConnected: boolean = true;
    private lastPingTime: number = 0;
    private pollingInterval: NodeJS.Timeout | null = null;
    private currentPollingDelay: number = 10000;
    private readonly BASE_DELAY = 10000;
    private readonly MAX_DELAY = 30000;
    private retryCount: number = 0;
    private appState: AppStateStatus = 'active';
    private consecutiveFailures: number = 0;
    private consecutiveSuccesses: number = 0;
    private readonly FAILURE_THRESHOLD = 3;
    private readonly SUCCESS_THRESHOLD = 2;
    private lastStateChange: number = 0;
    private readonly MIN_STATE_CHANGE_DELAY = 2000;

    //------This Function handles the Constructor---------
    constructor() {
        this.setupAppStateListener();
        this.startPolling();
    }

    //------This Function handles the Setup App State Listener---------
    private setupAppStateListener() {
        AppState.addEventListener('change', (nextAppState) => {
            const wasBackground = this.appState === 'background';
            const isActive = nextAppState === 'active';
            
            this.appState = nextAppState;

            if (wasBackground && isActive) {
                this.checkConnectionNow();
            }

            if (nextAppState === 'active') {
                this.startPolling();
            } else {
                this.stopPolling();
            }
        });
    }

    //------This Function handles the Start Polling---------
    startPolling() {
        this.stopPolling();
        
        this.checkConnectionNow();
        
        this.pollingInterval = setInterval(() => {
            this.checkConnectionNow();
        }, this.currentPollingDelay);
    }

    //------This Function handles the Stop Polling---------
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    //------This Function handles the Check Connection Now---------
    async checkConnectionNow(): Promise<boolean> {
        const startTime = Date.now();
        
        try {
            await api.get('/health', { timeout: 3000 });
            const pingTime = Date.now() - startTime;
            
            this.lastPingTime = pingTime;
            this.consecutiveFailures = 0;
            this.consecutiveSuccesses++;
            
            if (!this.isConnected && this.consecutiveSuccesses >= this.SUCCESS_THRESHOLD) {
                const now = Date.now();
                if (now - this.lastStateChange >= this.MIN_STATE_CHANGE_DELAY) {
                    this.retryCount = 0;
                    this.currentPollingDelay = this.BASE_DELAY;
                    this.isConnected = true;
                    this.lastStateChange = now;
                    this.notifyListeners(true, pingTime);
                }
            } else if (this.isConnected) {
                this.retryCount = 0;
                this.currentPollingDelay = this.BASE_DELAY;
            }
            
            return true;
        } catch (error) {
            this.consecutiveSuccesses = 0;
            this.consecutiveFailures++;
            this.retryCount++;
            
            this.currentPollingDelay = Math.min(
                this.BASE_DELAY + (this.retryCount * 5000),
                this.MAX_DELAY
            );
            
            if (this.isConnected && this.consecutiveFailures >= this.FAILURE_THRESHOLD) {
                const now = Date.now();
                if (now - this.lastStateChange >= this.MIN_STATE_CHANGE_DELAY) {
                    this.isConnected = false;
                    this.lastStateChange = now;
                    this.notifyListeners(false);
                }
            }
            
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
                this.pollingInterval = setInterval(() => {
                    this.checkConnectionNow();
                }, this.currentPollingDelay);
            }
            
            return false;
        }
    }

    //------This Function handles the Get Connection Status---------
    getConnectionStatus(): { connected: boolean; pingTime: number } {
        return {
            connected: this.isConnected,
            pingTime: this.lastPingTime,
        };
    }

    //------This Function handles the Subscribe---------
    subscribe(listener: ConnectionListener): () => void {
        this.listeners.add(listener);
        
        listener(this.isConnected, this.lastPingTime);
        
        return () => {
            this.listeners.delete(listener);
        };
    }

    //------This Function handles the Notify Listeners---------
    private notifyListeners(connected: boolean, pingTime?: number) {
        this.listeners.forEach(listener => {
            listener(connected, pingTime);
        });
    }
}

export const connectionMonitor = new ConnectionMonitor();
