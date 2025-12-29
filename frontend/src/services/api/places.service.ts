import { apiClient } from './client';
import { Place, NearbyPlacesRequest, PlaceSearchRequest, PLACE_CATEGORIES } from '@shared/types/places';

// Check if running in demo mode (frontend-only, no backend)
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || !import.meta.env.VITE_API_URL;

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

function transformMapboxFeature(feature: any): Place {
  // Infer category from Mapbox types
  const placeTypes = feature.place_type || [];
  let category: string | undefined;
  for (const type of placeTypes) {
    const found = PLACE_CATEGORIES.find(cat => 
      cat.keywords?.some(kw => type.toLowerCase().includes(kw.toLowerCase()))
    );
    if (found) {
      category = found.id;
      break;
    }
  }
  
  return {
    id: feature.id,
    name: feature.text || feature.place_name,
    coordinates: {
      longitude: feature.center[0],
      latitude: feature.center[1],
    },
    category,
    categoryIcon: category ? PLACE_CATEGORIES.find(c => c.id === category)?.icon || '📍' : '📍',
    address: feature.place_name,
    bbox: feature.bbox,
  };
}

export const placesService = {
  async searchPlaces(request: PlaceSearchRequest): Promise<Place[]> {
    if (IS_DEMO_MODE) {
      // Use direct Mapbox API in demo mode
      if (!MAPBOX_TOKEN) {
        throw new Error('Mapbox token not configured');
      }

      try {
        const proximityParam = request.coordinates
          ? `&proximity=${request.coordinates.longitude},${request.coordinates.latitude}`
          : '';
        const bboxParam = request.bbox ? `&bbox=${request.bbox.join(',')}` : '';
        const limitParam = request.limit ? `&limit=${request.limit}` : '&limit=20';
        
        // Map category to Mapbox types
        let typesParam = '';
        if (request.category) {
          const category = PLACE_CATEGORIES.find(c => c.id === request.category);
          if (category?.keywords) {
            // Use first keyword as type filter
            typesParam = `&types=${category.keywords[0]}`;
          }
        }

        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(request.query)}.json?access_token=${MAPBOX_TOKEN}${proximityParam}${bboxParam}${limitParam}${typesParam}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error.message || 'Places search failed');
        }

        return data.features.map((feature: any) => transformMapboxFeature(feature));
      } catch (error) {
        console.error('Places search error:', error);
        throw error;
      }
    }

    const params = new URLSearchParams({ query: request.query });
    if (request.category) params.append('category', request.category);
    if (request.coordinates) {
      params.append('longitude', request.coordinates.longitude.toString());
      params.append('latitude', request.coordinates.latitude.toString());
    }
    if (request.limit) params.append('limit', request.limit.toString());

    const response = await apiClient.instance.get<Place[]>(`/places/search?${params.toString()}`);
    return response.data;
  },

  async getNearbyPlaces(request: NearbyPlacesRequest): Promise<Place[]> {
    if (IS_DEMO_MODE) {
      // Use direct Mapbox API in demo mode
      if (!MAPBOX_TOKEN) {
        throw new Error('Mapbox token not configured');
      }

      try {
        const radius = request.radius || 1000;
        const limit = request.limit || 20;
        
        // Calculate bounding box from radius
        const latDelta = radius / 111000;
        const lngDelta = radius / (111000 * Math.cos((request.coordinates.latitude * Math.PI) / 180));
        const bbox: [number, number, number, number] = [
          request.coordinates.longitude - lngDelta,
          request.coordinates.latitude - latDelta,
          request.coordinates.longitude + lngDelta,
          request.coordinates.latitude + latDelta,
        ];
        
        const query = request.category || 'poi';
        const category = PLACE_CATEGORIES.find(c => c.id === request.category);
        const typesParam = category?.keywords ? `&types=${category.keywords[0]}` : '&types=poi';
        
        const proximityParam = `&proximity=${request.coordinates.longitude},${request.coordinates.latitude}`;
        const bboxParam = `&bbox=${bbox.join(',')}`;
        const limitParam = `&limit=${limit}`;

        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}${proximityParam}${bboxParam}${limitParam}${typesParam}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error.message || 'Nearby places search failed');
        }

        return data.features.map((feature: any) => transformMapboxFeature(feature));
      } catch (error) {
        console.error('Nearby places error:', error);
        throw error;
      }
    }

    const params = new URLSearchParams({
      longitude: request.coordinates.longitude.toString(),
      latitude: request.coordinates.latitude.toString(),
    });
    if (request.category) params.append('category', request.category);
    if (request.radius) params.append('radius', request.radius.toString());
    if (request.limit) params.append('limit', request.limit.toString());

    const response = await apiClient.instance.get<Place[]>(`/places/nearby?${params.toString()}`);
    return response.data;
  },

  async getPlaceDetails(placeId: string): Promise<Place> {
    if (IS_DEMO_MODE) {
      // Use direct Mapbox API in demo mode
      if (!MAPBOX_TOKEN) {
        throw new Error('Mapbox token not configured');
      }

      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${placeId}.json?access_token=${MAPBOX_TOKEN}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.error || !data.features || data.features.length === 0) {
          throw new Error('Place not found');
        }

        return transformMapboxFeature(data.features[0]);
      } catch (error) {
        console.error('Place details error:', error);
        throw error;
      }
    }

    const response = await apiClient.instance.get<Place>(`/places/${placeId}`);
    return response.data;
  },

  getCategories() {
    return PLACE_CATEGORIES;
  },
};

