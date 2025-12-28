// Direct Mapbox API service for frontend-only (demo) mode
// This bypasses the backend and calls Mapbox APIs directly

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export interface MapboxGeocodeResult {
  id: string;
  placeName: string;
  coordinates: { longitude: number; latitude: number };
  context?: Array<{ id: string; text: string }>;
}

export interface MapboxRouteResult {
  distance: number;
  duration: number;
  geometry: {
    coordinates: Array<{ longitude: number; latitude: number }>;
  };
}

export const mapboxDirectService = {
  async geocode(query: string): Promise<MapboxGeocodeResult[]> {
    if (!MAPBOX_TOKEN) {
      console.error('Mapbox token not configured');
      return [];
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5`
      );
      const data = await response.json();

      return data.features.map((feature: any) => ({
        id: feature.id,
        placeName: feature.place_name,
        coordinates: {
          longitude: feature.center[0],
          latitude: feature.center[1],
        },
        context: feature.context?.map((ctx: any) => ({
          id: ctx.id,
          text: ctx.text,
        })),
      }));
    } catch (error) {
      console.error('Geocoding error:', error);
      return [];
    }
  },

  async reverseGeocode(lng: number, lat: number): Promise<MapboxGeocodeResult[]> {
    if (!MAPBOX_TOKEN) return [];

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`
      );
      const data = await response.json();

      return data.features.map((feature: any) => ({
        id: feature.id,
        placeName: feature.place_name,
        coordinates: {
          longitude: feature.center[0],
          latitude: feature.center[1],
        },
      }));
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return [];
    }
  },

  async getRoute(
    waypoints: Array<{ longitude: number; latitude: number }>,
    profile: 'driving' | 'walking' | 'cycling' = 'driving'
  ): Promise<MapboxRouteResult | null> {
    if (!MAPBOX_TOKEN || waypoints.length < 2) return null;

    try {
      const coordinates = waypoints
        .map((wp) => `${wp.longitude},${wp.latitude}`)
        .join(';');

      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full&steps=true`
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          distance: route.distance,
          duration: route.duration,
          geometry: {
            coordinates: route.geometry.coordinates.map((coord: [number, number]) => ({
              longitude: coord[0],
              latitude: coord[1],
            })),
          },
        };
      }
      return null;
    } catch (error) {
      console.error('Routing error:', error);
      return null;
    }
  },
};

