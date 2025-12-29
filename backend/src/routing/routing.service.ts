import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  RoutingRequest,
  RoutingResponse,
  RoutingProfile,
  RouteWaypoint,
  Route,
} from '@shared/types/routing';

@Injectable()
export class RoutingService {
  private readonly mapboxAccessToken: string;
  private readonly mapboxApiUrl = 'https://api.mapbox.com/directions/v5';
  private readonly aviationStackApiKey: string;
  private readonly aviationStackApiUrl = 'https://api.aviationstack.com/v1';

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.mapboxAccessToken = this.configService.get<string>('MAPBOX_ACCESS_TOKEN');
    if (!this.mapboxAccessToken) {
      throw new Error('MAPBOX_ACCESS_TOKEN is required');
    }
    // AviationStack API key is optional - flight routing will use great-circle fallback if not configured
    this.aviationStackApiKey = this.configService.get<string>('AVIATIONSTACK_API_KEY') || '';
  }

  async getRoute(
    waypoints: RouteWaypoint[],
    profile: RoutingProfile,
    options?: {
      alternatives?: boolean;
      geometries?: 'geojson' | 'polyline';
      overview?: 'full' | 'simplified' | 'false';
      steps?: boolean;
    },
  ): Promise<RoutingResponse> {
    try {
      if (waypoints.length < 2) {
        throw new HttpException(
          'At least two waypoints are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Handle flight routing separately (great-circle distance)
      if (profile === 'flight') {
        return this.calculateFlightRoute(waypoints);
      }

      // Map profile names (our internal names may differ from Mapbox)
      const mapboxProfile = this.mapProfileToMapbox(profile);

      // Build coordinates string: lng,lat;lng,lat;...
      const coordinates = waypoints
        .map((wp) => `${wp.coordinates.longitude},${wp.coordinates.latitude}`)
        .join(';');

      const alternatives = options?.alternatives ? 'true' : 'false';
      const geometries = options?.geometries || 'geojson';
      const overview = options?.overview || 'full';
      const steps = options?.steps !== false ? 'true' : 'false';

      const url = `${this.mapboxApiUrl}/mapbox/${mapboxProfile}/${coordinates}?access_token=${this.mapboxAccessToken}&alternatives=${alternatives}&geometries=${geometries}&overview=${overview}&steps=${steps}`;

      const response = await firstValueFrom(this.httpService.get(url));

      // Transform Mapbox response to our RoutingResponse format
      return this.transformMapboxResponse(response.data, waypoints);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Routing request failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private mapProfileToMapbox(profile: RoutingProfile): string {
    const mapping: Record<RoutingProfile, string> = {
      driving: 'driving',
      'driving-traffic': 'driving-traffic',
      walking: 'walking',
      cycling: 'cycling',
      transit: 'driving', // Mapbox transit requires different endpoint, using driving as fallback
      flight: 'driving', // Flight is handled separately, this should never be called
    };
    return mapping[profile] || 'driving';
  }

  /**
   * Calculate flight route using AviationStack API or great-circle distance fallback
   * This creates a straight-line route between waypoints (as flights follow great-circle paths)
   */
  private async calculateFlightRoute(waypoints: RouteWaypoint[]): Promise<RoutingResponse> {
    const coordinates: Array<{ longitude: number; latitude: number }> = [];
    let totalDistance = 0;

    // Calculate distances and create route geometry
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      coordinates.push(wp.coordinates);

      if (i > 0) {
        const prevWp = waypoints[i - 1];
        const distance = this.calculateGreatCircleDistance(
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

    // Create a smooth great-circle path (simplified with intermediate points)
    const routeCoordinates = this.generateGreatCirclePath(coordinates);

    // Try to get real flight data from AviationStack if API key is configured
    let flightInfo = undefined;
    if (this.aviationStackApiKey && waypoints.length === 2) {
      try {
        flightInfo = await this.getFlightInfoFromAviationStack(waypoints[0], waypoints[1]);
      } catch (error) {
        console.warn('Failed to get flight info from AviationStack, using fallback:', error);
      }
    }

    const route: Route = {
      distance: totalDistance,
      duration: flightInfo?.duration || flightDuration,
      geometry: {
        coordinates: routeCoordinates,
      },
      legs: [
        {
          distance: totalDistance,
          duration: flightInfo?.duration || flightDuration,
          steps: [
            {
              distance: totalDistance,
              duration: flightInfo?.duration || flightDuration,
              instruction: flightInfo 
                ? `Flight ${flightInfo.airline} ${flightInfo.flightNumber} from ${flightInfo.departureAirport} to ${flightInfo.arrivalAirport}`
                : 'Fly direct to destination',
              maneuver: {
                type: 'depart',
                location: waypoints[0].coordinates,
              },
            },
          ],
        },
      ],
      weight: flightInfo?.duration || flightDuration,
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
    };

    return {
      code: 'Ok',
      routes: [route],
      waypoints: waypoints.map((wp) => ({
        location: wp.coordinates,
        name: wp.name,
      })),
    };
  }

  /**
   * Get flight information from AviationStack API
   * Searches for flights between departure and arrival locations
   */
  private async getFlightInfoFromAviationStack(
    departure: RouteWaypoint,
    arrival: RouteWaypoint,
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
    try {
      // First, find nearby airports for departure and arrival
      const depAirport = await this.findNearestAirport(departure.coordinates);
      const arrAirport = await this.findNearestAirport(arrival.coordinates);

      if (!depAirport || !arrAirport) {
        return null;
      }

      // Search for flights between these airports
      const url = `${this.aviationStackApiUrl}/flights?access_key=${this.aviationStackApiKey}&dep_iata=${depAirport.iata}&arr_iata=${arrAirport.iata}&limit=1`;
      
      const response = await firstValueFrom(this.httpService.get(url));
      const data = response.data;

      if (data.error) {
        console.warn('AviationStack API error:', data.error);
        return null;
      }

      if (!data.data || data.data.length === 0) {
        // No direct flights found, return airport info with estimated duration
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
          duration: this.calculateGreatCircleDistance(departure.coordinates, arrival.coordinates) / 250 + 3600,
        };
      }

      const flight = data.data[0];
      
      // Calculate duration from scheduled times if available
      let duration = this.calculateGreatCircleDistance(departure.coordinates, arrival.coordinates) / 250 + 3600;
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
   * Find nearest airport to given coordinates using AviationStack API
   */
  private async findNearestAirport(
    coordinates: { longitude: number; latitude: number },
  ): Promise<{ iata: string; name: string; lat: number; lng: number } | null> {
    try {
      // AviationStack doesn't have a direct "nearest airport" endpoint
      // We'll use the airports endpoint and search by country/city
      // For a production app, you might want to use a dedicated airports database
      
      // Try to get airports and find the nearest one
      const url = `${this.aviationStackApiUrl}/airports?access_key=${this.aviationStackApiKey}&limit=100`;
      
      const response = await firstValueFrom(this.httpService.get(url));
      const data = response.data;

      if (data.error || !data.data || data.data.length === 0) {
        // Fallback: use common airport codes based on rough location
        return this.getFallbackAirport(coordinates);
      }

      // Find nearest airport from the list
      let nearestAirport = null;
      let minDistance = Infinity;

      for (const airport of data.data) {
        if (!airport.latitude || !airport.longitude || !airport.iata_code) continue;
        
        const distance = this.calculateGreatCircleDistance(
          coordinates,
          { longitude: parseFloat(airport.longitude), latitude: parseFloat(airport.latitude) },
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestAirport = {
            iata: airport.iata_code,
            name: airport.airport_name,
            lat: parseFloat(airport.latitude),
            lng: parseFloat(airport.longitude),
          };
        }
      }

      // If no airport found within reasonable distance, use fallback
      if (!nearestAirport || minDistance > 500000) { // 500km threshold
        return this.getFallbackAirport(coordinates);
      }

      return nearestAirport;
    } catch (error) {
      console.error('Error finding nearest airport:', error);
      return this.getFallbackAirport(coordinates);
    }
  }

  /**
   * Get fallback airport based on rough geographic location
   */
  private getFallbackAirport(
    coordinates: { longitude: number; latitude: number },
  ): { iata: string; name: string; lat: number; lng: number } | null {
    // Major airports by region (rough approximation)
    const majorAirports = [
      { iata: 'JFK', name: 'John F. Kennedy International', lat: 40.6413, lng: -73.7781 },
      { iata: 'LAX', name: 'Los Angeles International', lat: 33.9425, lng: -118.4081 },
      { iata: 'ORD', name: 'Chicago O\'Hare International', lat: 41.9742, lng: -87.9073 },
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

    let nearestAirport = majorAirports[0];
    let minDistance = Infinity;

    for (const airport of majorAirports) {
      const distance = this.calculateGreatCircleDistance(
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
   * Calculate great-circle distance between two points using Haversine formula
   * Returns distance in meters
   */
  private calculateGreatCircleDistance(
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
   * Generate great-circle path between waypoints
   * Creates intermediate points to form a smooth arc
   */
  private generateGreatCirclePath(
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
        const intermediate = this.interpolateGreatCircle(start, end, fraction);
        path.push(intermediate);
      }

      // Add end point
      path.push(end);
    }

    return path;
  }

  /**
   * Interpolate a point along a great-circle path
   */
  private interpolateGreatCircle(
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

  private transformMapboxResponse(
    mapboxData: any,
    waypoints: RouteWaypoint[],
  ): RoutingResponse {
    const routes: Route[] = mapboxData.routes.map((route: any) => ({
      distance: route.distance,
      duration: route.duration,
      geometry: {
        coordinates: route.geometry.coordinates.map((coord: [number, number]) => ({
          longitude: coord[0],
          latitude: coord[1],
        })),
      },
      legs: route.legs.map((leg: any) => ({
        distance: leg.distance,
        duration: leg.duration,
        steps: leg.steps?.map((step: any) => ({
          distance: step.distance,
          duration: step.duration,
          instruction: step.maneuver.instruction || step.maneuver.type,
          maneuver: {
            type: step.maneuver.type,
            modifier: step.maneuver.modifier,
            bearing_after: step.maneuver.bearing_after,
            bearing_before: step.maneuver.bearing_before,
            location: {
              longitude: step.maneuver.location[0],
              latitude: step.maneuver.location[1],
            },
          },
          geometry: step.geometry
            ? {
                coordinates: step.geometry.coordinates.map((coord: [number, number]) => ({
                  longitude: coord[0],
                  latitude: coord[1],
                })),
              }
            : undefined,
        })) || [],
      })),
      weight: route.weight,
      weightName: route.weight_name,
    }));

    return {
      code: mapboxData.code,
      routes,
      waypoints: mapboxData.waypoints.map((wp: any, index: number) => ({
        location: {
          longitude: wp.location[0],
          latitude: wp.location[1],
        },
        name: waypoints[index]?.name,
      })),
    };
  }
}

