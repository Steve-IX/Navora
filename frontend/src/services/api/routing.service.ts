import { apiClient } from './client';
import { RoutingRequest, RoutingResponse } from '@shared/types/routing';
import { mapboxDirectService } from '../mapbox.service';

// Check if running in demo mode (frontend-only, no backend)
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || !import.meta.env.VITE_API_URL;

/**
 * Calculate great-circle distance between two points using Haversine formula
 * Returns distance in meters
 */
function calculateGreatCircleDistance(
  point1: { longitude: number; latitude: number },
  point2: { longitude: number; latitude: number },
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Interpolate a point along a great-circle path
 */
function interpolateGreatCircle(
  start: { longitude: number; latitude: number },
  end: { longitude: number; latitude: number },
  fraction: number,
): { longitude: number; latitude: number } {
  const lat1 = (start.latitude * Math.PI) / 180;
  const lat2 = (end.latitude * Math.PI) / 180;
  const lon1 = (start.longitude * Math.PI) / 180;
  const lon2 = (end.longitude * Math.PI) / 180;

  const d = Math.acos(
    Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1),
  );

  if (d === 0) {
    return { longitude: start.longitude, latitude: start.latitude };
  }

  const a = Math.sin((1 - fraction) * d) / Math.sin(d);
  const b = Math.sin(fraction * d) / Math.sin(d);

  const x =
    a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2);
  const y =
    a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2);
  const z = a * Math.sin(lat1) + b * Math.sin(lat2);

  const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lon = Math.atan2(y, x);

  return {
    latitude: (lat * 180) / Math.PI,
    longitude: (lon * 180) / Math.PI,
  };
}

/**
 * Generate great-circle path between waypoints
 * Creates intermediate points to form a smooth arc
 */
function generateGreatCirclePath(
  waypoints: Array<{ longitude: number; latitude: number }>,
): Array<{ longitude: number; latitude: number }> {
  if (waypoints.length < 2) {
    return waypoints;
  }

  const path: Array<{ longitude: number; latitude: number }> = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];

    // Add start point
    if (i === 0) {
      path.push(start);
    }

    // Generate intermediate points for smooth arc (10 points between waypoints)
    const numPoints = 10;
    for (let j = 1; j < numPoints; j++) {
      const fraction = j / numPoints;
      const intermediate = interpolateGreatCircle(start, end, fraction);
      path.push(intermediate);
    }

    // Add end point
    path.push(end);
  }

  return path;
}

/**
 * Calculate flight route using great-circle distance (for demo mode)
 */
function calculateFlightRoute(waypoints: Array<{ coordinates: { longitude: number; latitude: number }; name?: string }>): RoutingResponse {
  const coordinates: Array<{ longitude: number; latitude: number }> = [];
  let totalDistance = 0;

  // Calculate distances
  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    coordinates.push(wp.coordinates);

    if (i > 0) {
      const prevWp = waypoints[i - 1];
      const distance = calculateGreatCircleDistance(
        prevWp.coordinates,
        wp.coordinates,
      );
      totalDistance += distance;
    }
  }

  // Average commercial flight speed: ~900 km/h (250 m/s)
  // Add 1 hour for takeoff/landing procedures
  const flightSpeedMps = 250; // meters per second
  const flightDuration = totalDistance / flightSpeedMps + 3600; // +1 hour for procedures

  // Create a smooth great-circle path
  const routeCoordinates = generateGreatCirclePath(coordinates);

  return {
    code: 'Ok',
    routes: [{
      distance: totalDistance,
      duration: flightDuration,
      geometry: {
        coordinates: routeCoordinates,
      },
      legs: [{
        distance: totalDistance,
        duration: flightDuration,
        steps: [{
          distance: totalDistance,
          duration: flightDuration,
          instruction: 'Fly direct to destination',
          maneuver: {
            type: 'depart',
            location: waypoints[0].coordinates,
          },
        }],
      }],
      weight: flightDuration,
      weightName: 'duration',
    }],
    waypoints: waypoints.map((wp) => ({
      location: wp.coordinates,
      name: wp.name,
    })),
  };
}

export const routingService = {
  async getRoute(request: RoutingRequest): Promise<RoutingResponse> {
    if (IS_DEMO_MODE) {
      // Handle flight routing separately in demo mode
      if (request.profile === 'flight') {
        return calculateFlightRoute(request.waypoints);
      }

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
