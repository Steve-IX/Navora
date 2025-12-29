import { apiClient } from './client';
import { GeocodeResult, Coordinates } from '@shared/types/geocoding';
import { mapboxDirectService } from '../mapbox.service';
import { cacheService } from '../cache.service';

// Check if running in demo mode (frontend-only, no backend)
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || !import.meta.env.VITE_API_URL;

const generateCacheKey = (type: string, ...args: any[]): string => {
  return `geocode:${type}:${JSON.stringify(args)}`;
};

export const geocodingService = {
  async forwardGeocode(query: string): Promise<GeocodeResult[]> {
    const cacheKey = generateCacheKey('forward', query);
    
    // Check cache first
    const cached = await cacheService.getGeocode<GeocodeResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    let results: GeocodeResult[];
    if (IS_DEMO_MODE) {
      results = await mapboxDirectService.geocode(query);
    } else {
      const response = await apiClient.instance.get<GeocodeResult[]>('/geocoding/forward', {
        params: { query },
      });
      results = response.data;
    }

    // Cache results
    await cacheService.cacheGeocode(cacheKey, results);
    return results;
  },

  async reverseGeocode(coordinates: Coordinates): Promise<GeocodeResult[]> {
    const cacheKey = generateCacheKey('reverse', coordinates.latitude, coordinates.longitude);
    
    // Check cache first
    const cached = await cacheService.getGeocode<GeocodeResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    let results: GeocodeResult[];
    if (IS_DEMO_MODE) {
      results = await mapboxDirectService.reverseGeocode(coordinates.longitude, coordinates.latitude);
    } else {
      const response = await apiClient.instance.get<GeocodeResult[]>('/geocoding/reverse', {
        params: {
          lng: coordinates.longitude,
          lat: coordinates.latitude,
        },
      });
      results = response.data;
    }

    // Cache results
    await cacheService.cacheGeocode(cacheKey, results);
    return results;
  },

  async autocomplete(query: string): Promise<GeocodeResult[]> {
    const cacheKey = generateCacheKey('autocomplete', query);
    
    // Check cache first
    const cached = await cacheService.getGeocode<GeocodeResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    let results: GeocodeResult[];
    if (IS_DEMO_MODE) {
      results = await mapboxDirectService.geocode(query);
    } else {
      const response = await apiClient.instance.get<GeocodeResult[]>('/geocoding/autocomplete', {
        params: { query },
      });
      results = response.data;
    }

    // Cache results (shorter TTL for autocomplete)
    await cacheService.cacheGeocode(cacheKey, results);
    return results;
  },
};

