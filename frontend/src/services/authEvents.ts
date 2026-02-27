type AuthEventType = 'unauthorized' | 'session_expired';
type AuthEventListener = () => void;

class AuthEvents {
    private listeners: Record<AuthEventType, AuthEventListener[]> = {
        'unauthorized': [],
        'session_expired': []
    };

    //------This Function handles the Subscribe---------
    subscribe(type: AuthEventType, callback: AuthEventListener): () => void {
        if (!this.listeners[type]) {
            this.listeners[type] = [];
        }
        this.listeners[type].push(callback);

        return () => {
            this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
        };
    }

    //------This Function handles the Emit---------
    emit(type: AuthEventType) {
        if (this.listeners[type]) {
            this.listeners[type].forEach(callback => callback());
        }
    }
}

export const authEvents = new AuthEvents();
