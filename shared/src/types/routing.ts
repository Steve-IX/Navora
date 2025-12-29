import { Coordinates } from './geocoding';

export type RoutingProfile = 'driving' | 'walking' | 'cycling' | 'driving-traffic' | 'transit' | 'flight';

export interface RouteWaypoint {
  coordinates: Coordinates;
  name?: string;
}

export interface RouteLeg {
  distance: number; // in meters
  duration: number; // in seconds
  steps: RouteStep[];
}

export interface RouteStep {
  distance: number;
  duration: number;
  instruction: string;
  maneuver: {
    type: string;
    modifier?: string;
    bearing_after?: number;
    bearing_before?: number;
    location: Coordinates;
  };
  geometry?: {
    coordinates: Coordinates[];
  };
}

export interface Route {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: {
    coordinates: Coordinates[];
  };
  legs: RouteLeg[];
  weight: number;
  weightName: string;
}

export interface RoutingRequest {
  waypoints: RouteWaypoint[];
  profile: RoutingProfile;
  alternatives?: boolean;
  geometries?: 'geojson' | 'polyline';
  overview?: 'full' | 'simplified' | 'false';
  steps?: boolean;
}

export interface RoutingResponse {
  code: string;
  routes: Route[];
  waypoints: Array<{
    location: Coordinates;
    name?: string;
  }>;
}

