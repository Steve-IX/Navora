import { apiClient } from './client';
import { RoutingRequest, RoutingResponse } from '@shared/types/routing';
import { mapboxDirectService } from '../mapbox.service';

// Check if running in demo mode (frontend-only, no backend)
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || !import.meta.env.VITE_API_URL;

// AviationStack API key for flight routing
const AVIATIONSTACK_API_KEY = import.meta.env.VITE_AVIATIONSTACK_API_KEY || '';

// Major airports by region for fallback
const MAJOR_AIRPORTS = [
  { iata: 'JFK', name: 'John F. Kennedy International', lat: 40.6413, lng: -73.7781 },
  { iata: 'LAX', name: 'Los Angeles International', lat: 33.9425, lng: -118.4081 },
  { iata: 'ORD', name: "Chicago O'Hare International", lat: 41.9742, lng: -87.9073 },
  { iata: 'LHR', name: 'London Heathrow', lat: 51.4700, lng: -0.4543 },
  { iata: 'CDG', name: 'Paris Charles de Gaulle', lat: 49.0097, lng: 2.5479 },
  { iata: 'FRA', name: 'Frankfurt Airport', lat: 50.0379, lng: 8.5622 },
  { iata: 'DXB', name: 'Dubai International', lat: 25.2532, lng: 55.3657 },
  { iata: 'HND', name: 'Tokyo Haneda', lat: 35.5494, lng: 139.7798 },
  { iata: 'SIN', name: 'Singapore Changi', lat: 1.3644, lng: 103.9915 },
  { iata: 'SYD', name: 'Sydney Airport', lat: -33.9399, lng: 151.1753 },
  { iata: 'GRU', name: 'São Paulo Guarulhos', lat: -23.4356, lng: -46.4731 },
  { iata: 'JNB', name: 'Johannesburg O.R. Tambo', lat: -26.1392, lng: 28.2460 },
];

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
 * Find nearest airport to given coordinates
 */
function findNearestAirport(coordinates: { longitude: number; latitude: number }): {
  iata: string;
  name: string;
  lat: number;
  lng: number;
} {
  let nearestAirport = MAJOR_AIRPORTS[0];
  let minDistance = Infinity;

  for (const airport of MAJOR_AIRPORTS) {
    const distance = calculateGreatCircleDistance(
      coordinates,
      { longitude: airport.lng, latitude: airport.lat },
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestAirport = airport;
    }
  }

  return nearestAirport;
}

/**
 * Get flight information from AviationStack API
 */
async function getFlightInfoFromAviationStack(
  departure: { coordinates: { longitude: number; latitude: number }; name?: string },
  arrival: { coordinates: { longitude: number; latitude: number }; name?: string },
): Promise<{
  airline: string;
  airlineIata: string;
  flightNumber: string;
  departureAirport: string;
  departureIata: string;
  arrivalAirport: string;
  arrivalIata: string;
  scheduledDeparture: string;
  scheduledArrival: string;
  flightStatus: string;
  aircraft: string;
  duration: number;
} | null> {
  if (!AVIATIONSTACK_API_KEY) {
    return null;
  }

  try {
    const depAirport = findNearestAirport(departure.coordinates);
    const arrAirport = findNearestAirport(arrival.coordinates);

    // Note: AviationStack free tier only supports HTTP, not HTTPS
    const url = `http://api.aviationstack.com/v1/flights?access_key=${AVIATIONSTACK_API_KEY}&dep_iata=${depAirport.iata}&arr_iata=${arrAirport.iata}&limit=1`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.error || !data.data || data.data.length === 0) {
      // No direct flights found, return airport info with estimated duration
      const distance = calculateGreatCircleDistance(departure.coordinates, arrival.coordinates);
      return {
        airline: 'Direct flight',
        airlineIata: '',
        flightNumber: '',
        departureAirport: depAirport.name,
        departureIata: depAirport.iata,
        arrivalAirport: arrAirport.name,
        arrivalIata: arrAirport.iata,
        scheduledDeparture: '',
        scheduledArrival: '',
        flightStatus: 'estimated',
        aircraft: '',
        duration: distance / 250 + 3600,
      };
    }

    const flight = data.data[0];
    
    // Calculate duration from scheduled times if available
    let duration = calculateGreatCircleDistance(departure.coordinates, arrival.coordinates) / 250 + 3600;
    if (flight.departure?.scheduled && flight.arrival?.scheduled) {
      const depTime = new Date(flight.departure.scheduled).getTime();
      const arrTime = new Date(flight.arrival.scheduled).getTime();
      if (arrTime > depTime) {
        duration = (arrTime - depTime) / 1000; // Convert to seconds
      }
    }

    return {
      airline: flight.airline?.name || 'Unknown Airline',
      airlineIata: flight.airline?.iata || '',
      flightNumber: flight.flight?.iata || flight.flight?.number || '',
      departureAirport: flight.departure?.airport || depAirport.name,
      departureIata: flight.departure?.iata || depAirport.iata,
      arrivalAirport: flight.arrival?.airport || arrAirport.name,
      arrivalIata: flight.arrival?.iata || arrAirport.iata,
      scheduledDeparture: flight.departure?.scheduled || '',
      scheduledArrival: flight.arrival?.scheduled || '',
      flightStatus: flight.flight_status || 'scheduled',
      aircraft: flight.aircraft?.registration || '',
      duration,
    };
  } catch (error) {
    console.error('Error fetching flight data from AviationStack:', error);
    return null;
  }
}

/**
 * Calculate flight route using AviationStack API or great-circle distance fallback
 */
async function calculateFlightRoute(
  waypoints: Array<{ coordinates: { longitude: number; latitude: number }; name?: string }>
): Promise<RoutingResponse> {
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
  let flightDuration = totalDistance / flightSpeedMps + 3600; // +1 hour for procedures

  // Create a smooth great-circle path
  const routeCoordinates = generateGreatCirclePath(coordinates);

  // Try to get real flight data from AviationStack
  let flightInfo = null;
  if (waypoints.length === 2) {
    try {
      flightInfo = await getFlightInfoFromAviationStack(waypoints[0], waypoints[1]);
      if (flightInfo?.duration) {
        flightDuration = flightInfo.duration;
      }
    } catch (error) {
      console.warn('Failed to get flight info from AviationStack:', error);
    }
  }

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
          instruction: flightInfo 
            ? `Flight ${flightInfo.airline} ${flightInfo.flightNumber} from ${flightInfo.departureAirport} to ${flightInfo.arrivalAirport}`
            : 'Fly direct to destination',
          maneuver: {
            type: 'depart',
            location: waypoints[0].coordinates,
          },
        }],
      }],
      weight: flightDuration,
      weightName: 'duration',
      flightInfo: flightInfo ? {
        airline: flightInfo.airline,
        airlineIata: flightInfo.airlineIata,
        flightNumber: flightInfo.flightNumber,
        departureAirport: flightInfo.departureAirport,
        departureIata: flightInfo.departureIata,
        arrivalAirport: flightInfo.arrivalAirport,
        arrivalIata: flightInfo.arrivalIata,
        scheduledDeparture: flightInfo.scheduledDeparture,
        scheduledArrival: flightInfo.scheduledArrival,
        flightStatus: flightInfo.flightStatus,
        aircraft: flightInfo.aircraft,
      } : undefined,
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
