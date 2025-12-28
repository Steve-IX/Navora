import { apiClient } from './client';
import { GeocodeResult, Coordinates } from '@shared/types/geocoding';
import { mapboxDirectService } from '../mapbox.service';

// Check if running in demo mode (frontend-only, no backend)
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || !import.meta.env.VITE_API_URL;

export const geocodingService = {
  async forwardGeocode(query: string): Promise<GeocodeResult[]> {
    if (IS_DEMO_MODE) {
      return mapboxDirectService.geocode(query);
    }
    const response = await apiClient.instance.get<GeocodeResult[]>('/geocoding/forward', {
      params: { query },
    });
    return response.data;
  },

  async reverseGeocode(coordinates: Coordinates): Promise<GeocodeResult[]> {
    if (IS_DEMO_MODE) {
      return mapboxDirectService.reverseGeocode(coordinates.longitude, coordinates.latitude);
    }
    const response = await apiClient.instance.get<GeocodeResult[]>('/geocoding/reverse', {
      params: {
        lng: coordinates.longitude,
        lat: coordinates.latitude,
      },
    });
    return response.data;
  },

  async autocomplete(query: string): Promise<GeocodeResult[]> {
    if (IS_DEMO_MODE) {
      return mapboxDirectService.geocode(query);
    }
    const response = await apiClient.instance.get<GeocodeResult[]>('/geocoding/autocomplete', {
      params: { query },
    });
    return response.data;
  },
};

