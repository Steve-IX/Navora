import { apiClient } from './client';
import { RoutingRequest, RoutingResponse } from '@shared/types/routing';
import { mapboxDirectService } from '../mapbox.service';

// Check if running in demo mode (frontend-only, no backend)
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || !import.meta.env.VITE_API_URL;

export const routingService = {
  async getRoute(request: RoutingRequest): Promise<RoutingResponse> {
    if (IS_DEMO_MODE) {
      // Use direct Mapbox API in demo mode
      const waypoints = request.waypoints.map((wp) => wp.coordinates);
      const profile = request.profile === 'driving-traffic' ? 'driving' : 
                      request.profile === 'transit' ? 'driving' : 
                      request.profile;
      
      const route = await mapboxDirectService.getRoute(waypoints, profile as 'driving' | 'walking' | 'cycling');
      
      if (!route) {
        throw new Error('Failed to calculate route');
      }

      return {
        code: 'Ok',
        routes: [{
          distance: route.distance,
          duration: route.duration,
          geometry: route.geometry,
          legs: [{
            distance: route.distance,
            duration: route.duration,
            steps: [],
          }],
          weight: route.duration,
          weightName: 'duration',
        }],
        waypoints: request.waypoints.map((wp) => ({
          location: wp.coordinates,
          name: wp.name,
        })),
      };
    }

    const response = await apiClient.instance.post<RoutingResponse>('/routing/route', request);
    return response.data;
  },
};

