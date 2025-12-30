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
  transportMode?: 'walking' | 'driving' | 'transit' | 'flight' | 'transfer';
  modeLabel?: string; // e.g., "Walk", "Drive", "Flight AA123", "Transfer at JFK"
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
  transportMode?: string;
  transferInfo?: {
    airport?: string;
    layoverDuration?: number;
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
  // Flight-specific fields (optional, only present for flight routes)
  flightInfo?: {
    airline?: string;
    airlineIata?: string;
    flightNumber?: string;
    departureAirport?: string;
    departureIata?: string;
    departureLat?: number;
    departureLng?: number;
    arrivalAirport?: string;
    arrivalIata?: string;
    arrivalLat?: number;
    arrivalLng?: number;
    scheduledDeparture?: string;
    scheduledArrival?: string;
    flightStatus?: string;
    aircraft?: string;
    // Support for multiple flight segments (connecting flights)
    segments?: Array<{
      airline?: string;
      airlineIata?: string;
      flightNumber?: string;
      departureAirport?: string;
      departureIata?: string;
      arrivalAirport?: string;
      arrivalIata?: string;
      scheduledDeparture?: string;
      scheduledArrival?: string;
      flightStatus?: string;
      aircraft?: string;
    }>;
    // Transfer/layover information
    transfers?: Array<{
      airport?: string;
      airportIata?: string;
      layoverDuration?: number; // in seconds
    }>;
  };
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

