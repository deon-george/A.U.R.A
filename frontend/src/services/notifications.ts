let FirebaseMessagingStub: any = null;

try {
  FirebaseMessagingStub = require('@react-native-firebase/messaging').default;
} catch (e) {
  console.log('Firebase messaging not available in Expo Go - using stub');
}

import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

//------This Function handles the Create Messaging Stub---------
const createMessagingStub = () => ({
  setBackgroundMessageHandler: () => { },
  requestPermission: async () => ({ status: 'denied' }),
  getToken: async () => null,
  onMessage: () => () => { },
  onNotificationOpenedApp: () => () => { },
  getInitialNotification: async () => null,
  deleteToken: async () => { },
  AuthorizationStatus: { AUTHORIZED: 0, PROVISIONAL: 1 },
});

export interface NotificationPayload {
  type: 'medication' | 'sos' | 'general';
  title: string;
  body: string;
  data?: any;
}

class NotificationService {
  private fcmToken: string | null = null;
  private isInitialized: boolean = false;
  private messagingInstance: any = null;

  //------This Function handles the Initialize---------
  async initialize() {
    if (this.isInitialized) return;

    try {
      if (FirebaseMessagingStub) {
        this.messagingInstance = FirebaseMessagingStub();
      } else {
        this.messagingInstance = createMessagingStub();
      }

      this.messagingInstance.setBackgroundMessageHandler(async (remoteMessage: any) => {
        console.log('Background notification:', remoteMessage);
      });

      const authStatusEnum = FirebaseMessagingStub?.AuthorizationStatus
        || this.messagingInstance?.AuthorizationStatus
        || { AUTHORIZED: 1, PROVISIONAL: 2 };
      const authStatus = await this.messagingInstance.requestPermission();
      const enabled =
        authStatus === authStatusEnum.AUTHORIZED ||
        authStatus === authStatusEnum.PROVISIONAL;

      if (!enabled) {
        console.log('Push notification permission not granted');
        return;
      }

      this.fcmToken = await this.messagingInstance.getToken();
      await AsyncStorage.setItem('fcm_token', this.fcmToken || '');
      console.log('FCM Token:', this.fcmToken);

      if (this.fcmToken) {
        await this.registerTokenWithBackend(this.fcmToken);
      }

      //------This Function handles the Unsubscribe---------
      const unsubscribe = this.messagingInstance.onMessage(async (remoteMessage: any) => {
        console.log('Foreground notification:', remoteMessage);
        this.handleForegroundNotification(remoteMessage);
      });

      this.messagingInstance.onNotificationOpenedApp((remoteMessage: any) => {
        console.log('Notification opened app from background:', remoteMessage);
        this.handleNotificationTap(remoteMessage);
      });

      this.messagingInstance
        .getInitialNotification()
        .then((remoteMessage: any) => {
          if (remoteMessage) {
            console.log('Notification opened app from quit state:', remoteMessage);
            this.handleNotificationTap(remoteMessage);
          }
        });

      this.isInitialized = true;
      console.log('Notification service initialized');
    } catch (error) {
      console.log('Notification initialization skipped:', error);
    }
  }

  //------This Function handles the Register Token With Backend---------
  private async registerTokenWithBackend(token: string) {
    try {
      await api.post('/notifications/register', { fcm_token: token });
      console.log('FCM token registered with backend');
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('Notification registration skipped (backend not ready)');
      } else {
        console.log('FCM token registration failed');
      }
    }
  }

  //------This Function handles the Handle Foreground Notification---------
  private handleForegroundNotification(remoteMessage: any) {
    const notification = remoteMessage.notification;
    if (!notification) return;

    Alert.alert(
      notification.title || 'Notification',
      notification.body || '',
      [
        {
          text: 'Dismiss',
          style: 'cancel',
        },
        {
          text: 'View',
          onPress: () => this.handleNotificationTap(remoteMessage),
        },
      ]
    );
  }

  //------This Function handles the Handle Notification Tap---------
  private handleNotificationTap(remoteMessage: any) {
    const data = remoteMessage.data;
    if (!data) return;

    switch (data.type) {
      case 'medication':
        console.log('Navigate to medications');
        break;
      case 'sos':
        console.log('Navigate to SOS alerts');
        break;
      default:
        console.log('Unknown notification type:', data.type);
    }
  }

  //------This Function handles the Send Local Notification---------
  async sendLocalNotification(payload: NotificationPayload) {
    Alert.alert(payload.title, payload.body);
  }

  //------This Function handles the Unregister---------
  async unregister() {
    try {
      if (this.fcmToken) {
        await api.post('/notifications/unregister', { fcm_token: this.fcmToken });
      }
      if (this.messagingInstance) {
        await this.messagingInstance.deleteToken();
      }
      await AsyncStorage.removeItem('fcm_token');
      this.fcmToken = null;
      this.isInitialized = false;
      console.log('Notification service unregistered');
    } catch (error) {
      console.log('Notification unregister skipped');
    }
  }

  //------This Function handles the Get Token---------
  getToken(): string | null {
    return this.fcmToken;
  }
}

export const notificationService = new NotificationService();
