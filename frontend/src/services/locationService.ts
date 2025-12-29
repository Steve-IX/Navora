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

interface IPGeolocationResponse {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
}

export class LocationService {
  private watchId: number | null = null;
  private options: LocationServiceOptions;
  private listeners: Set<(location: LocationTracking) => void> = new Set();
  private cachedIPLocation: Coordinates | null = null;

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
        // Fallback to IP geolocation if browser geolocation is not supported
        this.getIPGeolocation()
          .then((location) => resolve(location))
          .catch(() => reject(new Error('Geolocation is not supported')));
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
        async (error) => {
          // If browser geolocation fails, try IP-based geolocation as fallback
          try {
            const ipLocation = await this.getIPGeolocation();
            resolve(ipLocation);
          } catch (ipError) {
            reject(error);
          }
        },
        this.options,
      );
    });
  }

  private async getIPGeolocation(): Promise<LocationTracking> {
    // Use cached location if available
    if (this.cachedIPLocation) {
      return {
        coordinates: this.cachedIPLocation,
        timestamp: new Date(),
      };
    }

    try {
      // Try ipapi.co first (more reliable)
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) {
        throw new Error('IP geolocation API failed');
      }
      const data: IPGeolocationResponse = await response.json();
      
      if (data.latitude && data.longitude) {
        const coordinates: Coordinates = {
          latitude: data.latitude,
          longitude: data.longitude,
        };
        // Cache the result
        this.cachedIPLocation = coordinates;
        return {
          coordinates,
          timestamp: new Date(),
        };
      }
      throw new Error('Invalid IP geolocation response');
    } catch (error) {
      // Fallback to ip-api.com
      try {
        const response = await fetch('http://ip-api.com/json/');
        if (!response.ok) {
          throw new Error('IP geolocation API failed');
        }
        const data: IPGeolocationResponse = await response.json();
        
        if (data.latitude && data.longitude) {
          const coordinates: Coordinates = {
            latitude: data.latitude,
            longitude: data.longitude,
          };
          // Cache the result
          this.cachedIPLocation = coordinates;
          return {
            coordinates,
            timestamp: new Date(),
          };
        }
        throw new Error('Invalid IP geolocation response');
      } catch (fallbackError) {
        throw new Error('IP geolocation failed');
      }
    }
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

