import { Coordinates } from '@shared/types/geocoding';

export interface LocationTracking {
  coordinates: Coordinates;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
}

export interface LocationServiceOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  updateInterval?: number;
}

export class LocationService {
  private watchId: number | null = null;
  private options: LocationServiceOptions;
  private listeners: Set<(location: LocationTracking) => void> = new Set();

  constructor(options: LocationServiceOptions = {}) {
    this.options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      updateInterval: 1000,
      ...options,
    };
  }

  async getCurrentPosition(): Promise<LocationTracking> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            coordinates: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            accuracy: position.coords.accuracy,
            heading: position.coords.heading ?? undefined,
            speed: position.coords.speed ?? undefined,
            timestamp: new Date(position.timestamp),
          });
        },
        (error) => {
          reject(error);
        },
        this.options,
      );
    });
  }

  startTracking(callback: (location: LocationTracking) => void): void {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    this.listeners.add(callback);

    if (this.watchId !== null) {
      return; // Already tracking
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: LocationTracking = {
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          accuracy: position.coords.accuracy,
          heading: position.coords.heading ?? undefined,
          speed: position.coords.speed ?? undefined,
          timestamp: new Date(position.timestamp),
        };

        this.listeners.forEach((listener) => listener(location));
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      this.options,
    );
  }

  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.listeners.clear();
  }

  removeListener(callback: (location: LocationTracking) => void): void {
    this.listeners.delete(callback);
    if (this.listeners.size === 0 && this.watchId !== null) {
      this.stopTracking();
    }
  }
}

export const locationService = new LocationService();

