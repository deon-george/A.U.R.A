import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import api from './api';

const LOCATION_TASK_NAME = 'background-location-task';
const GEOFENCE_TASK_NAME = 'geofence-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    const location = locations[0];

    if (location) {
      console.log('Background location update:', location.coords);

      try {
        const token = await AsyncStorage.getItem('firebase_token');

        if (!token) {
          await AsyncStorage.setItem('last_location', JSON.stringify({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
          }));
          return;
        }

        try {
          await api.put('/location/update', {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude,
            heading: location.coords.heading,
            speed: location.coords.speed,
            timestamp: location.timestamp,
          }, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
        } catch (apiError: any) {
          if (apiError.response?.status === 404 || apiError.response?.status === 422) {
            console.log('Location update skipped (backend not ready)');
          } else {
            console.error('Failed to update location:', apiError);
          }
        }

        await AsyncStorage.setItem('last_location', JSON.stringify({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: location.timestamp,
        }));
      } catch (error) {
        console.log('Failed to save location locally');
      }
    }
  }
});

TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Geofence error:', error);
    return;
  }

  if (data) {
    const { eventType, region } = data;
    console.log('Geofence event:', eventType, region);

    try {
      const token = await AsyncStorage.getItem('firebase_token');

      if (!token) {
        return;
      }

      await api.post('/location/geofence-event', {
        event_type: eventType === Location.GeofencingEventType.Enter ? 'enter' : 'exit',
        region_id: region.identifier,
        region_name: region.notifyOnEntry ? 'safe_zone' : 'restricted_zone',
        timestamp: Date.now(),
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (eventType === Location.GeofencingEventType.Exit) {
        console.log('Patient left safe zone!');
      }
    } catch (error) {
      console.error('Failed to report geofence event:', error);
    }
  }
});

class LocationService {
  private isTracking: boolean = false;
  private hasPermission: boolean = false;
  private hasBackgroundPermission: boolean = false;

  //------This Function handles the Request Permissions---------
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== 'granted') {
        console.log('Foreground location permission denied');
        this.hasPermission = false;
        this.hasBackgroundPermission = false;
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

      this.hasPermission = true;
      this.hasBackgroundPermission = backgroundStatus === 'granted';
      console.log('Location permissions granted');
      return true;
    } catch (error) {
      console.error('Failed to request location permissions:', error);
      this.hasPermission = false;
      this.hasBackgroundPermission = false;
      return false;
    }
  }

  //------This Function handles the Start Tracking---------
  async startTracking() {
    if (this.isTracking) {
      console.log('Location tracking already active');
      return;
    }

    if (!this.hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) {
        console.log('Cannot start tracking without permissions');
        return;
      }
    }

    //------This Function handles the Start Location Updates---------
    const startLocationUpdates = async () => {
      try {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 60000,
          distanceInterval: 100,
          pausesUpdatesAutomatically: false,
          activityType: Location.ActivityType.Other,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: "AURA Active",
            notificationBody: "Monitoring your safety in the background",
            notificationColor: "#FF3B30"
          }
        });
        this.isTracking = true;
        await AsyncStorage.setItem('location_tracking_enabled', 'true');
        console.log('Background location tracking started');
      } catch (error: any) {
        if (error.message?.includes('foreground service') || error.message?.includes('Foreground service')) {
          console.log('Background location unavailable, using foreground polling');
          this.startForegroundPolling();
        } else {
          console.log('Location tracking unavailable:', error.message);
        }
      }
    };

    if (!this.hasBackgroundPermission) {
      this.startForegroundPolling();
      await AsyncStorage.setItem('location_tracking_enabled', 'true');
      return;
    }

    if (AppState.currentState === 'active') {
      await startLocationUpdates();
      return;
    }

    console.log('App in background, queuing location tracking start');
    //------This Function handles the Subscription---------
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        await startLocationUpdates();
        subscription.remove();
      }
    });
  }

  private foregroundInterval: ReturnType<typeof setInterval> | null = null;

  //------This Function handles the Start Foreground Polling---------
  private startForegroundPolling() {
    if (this.foregroundInterval) return;
    this.isTracking = true;

    this.foregroundInterval = setInterval(async () => {
      if (AppState.currentState !== 'active') return;
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const token = await AsyncStorage.getItem('firebase_token');
        if (token && !token.startsWith('dev-token-')) {
          await api.put('/location/update', {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
          }).catch(() => { });
        }
        await AsyncStorage.setItem('last_location', JSON.stringify({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: location.timestamp,
        }));
      } catch { }
    }, 120000);

    console.log('Foreground location polling started');
  }

  //------This Function handles the Stop Tracking---------
  async stopTracking() {
    if (!this.isTracking && !this.foregroundInterval) {
      console.log('Location tracking not active');
      return;
    }

    try {
      const hasBackgroundTask = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (hasBackgroundTask) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        console.log('Background location tracking stopped');
      }
    } catch (error) {
      console.error('Failed to stop location tracking:', error);
    }

    if (this.foregroundInterval) {
      clearInterval(this.foregroundInterval);
      this.foregroundInterval = null;
      console.log('Foreground location polling stopped');
    }

    this.isTracking = false;
    await AsyncStorage.setItem('location_tracking_enabled', 'false');
  }

  //------This Function handles the Get Current Location---------
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      if (!this.hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return location;
    } catch (error) {
      console.error('Failed to get current location:', error);
      return null;
    }
  }

  //------This Function handles the Setup Geofence---------
  async setupGeofence(latitude: number, longitude: number, radius: number = 500) {
    try {
      if (!this.hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) return;
      }

      const region = {
        identifier: 'safe_zone',
        latitude,
        longitude,
        radius,
        notifyOnEnter: false,
        notifyOnExit: true,
      };

      await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, [region]);
      console.log('Geofence setup complete');
    } catch (error) {
      console.error('Failed to setup geofence:', error);
    }
  }

  //------This Function handles the Remove Geofence---------
  async removeGeofence() {
    try {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
      console.log('Geofence removed');
    } catch (error) {
      console.error('Failed to remove geofence:', error);
    }
  }

  //------This Function handles the Is Tracking Active---------
  async isTrackingActive(): Promise<boolean> {
    const hasTask = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    return hasTask || !!this.foregroundInterval;
  }

  //------This Function handles the Get Last Known Location---------
  async getLastKnownLocation(): Promise<{ latitude: number; longitude: number; timestamp: number } | null> {
    try {
      const stored = await AsyncStorage.getItem('last_location');
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    } catch (error) {
      console.error('Failed to get last known location:', error);
      return null;
    }
  }
}

export const locationService = new LocationService();
