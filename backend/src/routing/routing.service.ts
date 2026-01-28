import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
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
import { GeocodingService } from '../geocoding/geocoding.service';

// Flight API types
export interface FlightSearchParams {
  flightNumber?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  airlineIata?: string;
  flightStatus?: string;
  limit?: number;
  offset?: number;
}

export interface AirportSearchParams {
  search?: string;
  countryCode?: string;
  limit?: number;
  offset?: number;
}

export interface FlightData {
  flightNumber: string;
  airline: {
    name: string;
    iata: string;
    icao: string;
  };
  departure: {
    airport: string;
    iata: string;
    icao: string;
    terminal: string | null;
    gate: string | null;
    scheduled: string | null;
    estimated: string | null;
    actual: string | null;
    timezone: string;
  };
  arrival: {
    airport: string;
    iata: string;
    icao: string;
    terminal: string | null;
    gate: string | null;
    scheduled: string | null;
    estimated: string | null;
    actual: string | null;
    timezone: string;
  };
  status: string;
  aircraft: {
    registration: string;
    iata: string;
    icao: string;
  } | null;
  live: {
    latitude: number;
    longitude: number;
    altitude: number;
    speed: number;
    direction: number;
    isGround: boolean;
    updated: string;
  } | null;
}

export interface AirportData {
  name: string;
  iata: string;
  icao: string;
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface FlightSearchResponse {
  flights: FlightData[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
    total: number;
  };
}

export interface AirportSearchResponse {
  airports: AirportData[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
    total: number;
  };
}

/**
 * Simplified Route Planner Service
 * Inspired by Google Maps - clean, simple, reliable
 */
@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private readonly mapboxAccessToken: string;
  private readonly mapboxApiUrl = 'https://api.mapbox.com/directions/v5';
  private readonly aviationStackApiKey: string;
  // Note: AviationStack free tier only supports HTTP
  private readonly aviationStackApiUrl = 'http://api.aviationstack.com/v1';

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private geocodingService: GeocodingService,
  ) {
    this.mapboxAccessToken = this.configService.get<string>('MAPBOX_ACCESS_TOKEN');
    if (!this.mapboxAccessToken) {
      throw new Error('MAPBOX_ACCESS_TOKEN is required');
    }
    this.aviationStackApiKey =
      this.configService.get<string>('AVIATIONSTACK_KEY') ||
      this.configService.get<string>('AVIATIONSTACK_API_KEY') ||
      '';
    if (!this.aviationStackApiKey) {
      this.logger.warn('AVIATIONSTACK_KEY not configured - flight search disabled');
    }
  }

  /**
   * Main route calculation entry point
   * Simple, clean interface like Google Maps
   */
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
    // Validate inputs
    this.validateWaypoints(waypoints);

    // Route based on transport mode
    if (profile === 'flight') {
      return this.calculateFlightRoute(waypoints[0], waypoints[waypoints.length - 1]);
    }

    // Ground transport routes
    return this.calculateGroundRoute(waypoints, profile, options);
  }

  /**
   * Calculate ground transport route (driving, walking, cycling, transit)
   */
  private async calculateGroundRoute(
    waypoints: RouteWaypoint[],
    profile: RoutingProfile,
    options?: {
      alternatives?: boolean;
      geometries?: 'geojson' | 'polyline';
      overview?: 'full' | 'simplified' | 'false';
      steps?: boolean;
    },
  ): Promise<RoutingResponse> {
    const mapboxProfile = this.mapProfileToMapbox(profile);
    const coordinates = waypoints
      .map((wp) => `${wp.coordinates.longitude},${wp.coordinates.latitude}`)
      .join(';');

    const alternatives = options?.alternatives ? 'true' : 'false';
    const geometries = options?.geometries || 'geojson';
    const overview = options?.overview || 'full';
    const steps = options?.steps !== false ? 'true' : 'false';

    const url = `${this.mapboxApiUrl}/mapbox/${mapboxProfile}/${coordinates}?access_token=${this.mapboxAccessToken}&alternatives=${alternatives}&geometries=${geometries}&overview=${overview}&steps=${steps}`;

    try {
      const response = await firstValueFrom(this.httpService.get(url));
      return this.transformMapboxResponse(response.data, waypoints);
    } catch (error) {
      throw new HttpException(
        'Failed to calculate route. Please check your origin and destination.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Calculate flight route with proper geographic validation
   * Simple, clean logic like Google Maps
   */
  private async calculateFlightRoute(
    origin: RouteWaypoint,
    destination: RouteWaypoint,
  ): Promise<RoutingResponse> {
    // Get countries
    const originCountry = await this.getCountry(origin.coordinates);
    const destCountry = await this.getCountry(destination.coordinates);

    // Validate distance (300km minimum for flights - aligns with Google Maps)
    const distance = this.calculateDistance(origin.coordinates, destination.coordinates);
    if (distance < 300000) {
      throw new HttpException(
        'Origin and destination are too close for flight routing. Please use ground transport.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Find airports in same countries
    const depAirport = await this.findAirportInCountry(origin.coordinates, originCountry);
    const arrAirport = await this.findAirportInCountry(destination.coordinates, destCountry);

    // CRITICAL: Fail fast if airports cannot be found - never guess
    if (!depAirport || !arrAirport) {
      throw new HttpException(
        'Could not find suitable airports near the selected locations. Please select locations closer to airports.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // CRITICAL: Validate origin to departure airport distance (prevent insane pre-flight travel)
    const depToOrigin = this.calculateDistance(origin.coordinates, {
      longitude: depAirport.lng,
      latitude: depAirport.lat,
    });
    if (depToOrigin > 500000) {
      throw new HttpException(
        'Departure airport is too far from origin. Please select a location closer to an airport.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // CRITICAL: Validate destination to arrival airport distance
    const arrToDest = this.calculateDistance(destination.coordinates, {
      longitude: arrAirport.lng,
      latitude: arrAirport.lat,
    });
    if (arrToDest > 500000) {
      throw new HttpException(
        'Arrival airport is too far from destination. Please select a location closer to an airport.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate airports are different
    if (depAirport.iata === arrAirport.iata) {
      throw new HttpException(
        'Origin and destination are in the same airport area. Please use ground transport.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Build route segments
    const legs: any[] = [];
    let totalDistance = 0;
    let totalDuration = 0;
    const allCoordinates: Array<{ longitude: number; latitude: number }> = [];

    // 1. Origin to departure airport
    const toAirport = await this.calculateGroundSegment(origin.coordinates, {
      longitude: depAirport.lng,
      latitude: depAirport.lat,
    });
    if (toAirport) {
      legs.push({
        distance: toAirport.distance,
        duration: toAirport.duration,
        geometry: toAirport.geometry,
        transportMode: 'driving', // Keep as driving for now, can be enhanced later
        modeLabel: `Travel to ${depAirport.name} (${depAirport.iata})`, // Changed from "Drive" to "Travel"
        steps: [
          {
            distance: toAirport.distance,
            duration: toAirport.duration,
            instruction: `Travel to ${depAirport.name} (${depAirport.iata})`,
            maneuver: {
              type: 'depart',
              location: origin.coordinates,
            },
            transportMode: 'driving',
          },
        ],
      });
      totalDistance += toAirport.distance;
      totalDuration += toAirport.duration;
      allCoordinates.push(...toAirport.geometry);
    }

    // 2. Flight segment
    const flightDistance = this.calculateDistance(
      { longitude: depAirport.lng, latitude: depAirport.lat },
      { longitude: arrAirport.lng, latitude: arrAirport.lat },
    );
    const flightDuration = this.estimateFlightTime(flightDistance);

    const flightGeometry = this.generateFlightPath(
      { longitude: depAirport.lng, latitude: depAirport.lat },
      { longitude: arrAirport.lng, latitude: arrAirport.lat },
    );

    legs.push({
      distance: flightDistance,
      duration: flightDuration,
      geometry: flightGeometry,
      steps: [
        {
          distance: flightDistance,
          duration: flightDuration,
          instruction: `Flight from ${depAirport.name} (${depAirport.iata}) to ${arrAirport.name} (${arrAirport.iata})`,
          maneuver: {
            type: 'depart',
            location: { longitude: depAirport.lng, latitude: depAirport.lat },
          },
          transportMode: 'flight',
        },
      ],
      transportMode: 'flight',
      modeLabel: `Flight ${depAirport.iata} → ${arrAirport.iata}`,
    });
    totalDistance += flightDistance;
    totalDuration += flightDuration;
    allCoordinates.push(...flightGeometry);

    // 3. Arrival airport to destination
    const fromAirport = await this.calculateGroundSegment(
      { longitude: arrAirport.lng, latitude: arrAirport.lat },
      destination.coordinates,
    );
    if (fromAirport) {
      legs.push({
        distance: fromAirport.distance,
        duration: fromAirport.duration,
        geometry: fromAirport.geometry,
        transportMode: 'driving', // Keep as driving for now, can be enhanced later
        modeLabel: `Travel from ${arrAirport.name} (${arrAirport.iata}) to destination`, // Changed from "Drive" to "Travel"
        steps: [
          {
            distance: fromAirport.distance,
            duration: fromAirport.duration,
            instruction: `Travel from ${arrAirport.name} (${arrAirport.iata}) to destination`,
            maneuver: {
              type: 'arrive',
              location: destination.coordinates,
            },
            transportMode: 'driving',
          },
        ],
      });
      totalDistance += fromAirport.distance;
      totalDuration += fromAirport.duration;
      allCoordinates.push(...fromAirport.geometry);
    }

    const route: Route = {
      distance: totalDistance,
      duration: totalDuration,
      geometry: { coordinates: allCoordinates },
      legs,
      weight: totalDuration,
      weightName: 'duration',
      flightInfo: {
        departureAirport: depAirport.name,
        departureIata: depAirport.iata,
        departureLat: depAirport.lat,
        departureLng: depAirport.lng,
        arrivalAirport: arrAirport.name,
        arrivalIata: arrAirport.iata,
        arrivalLat: arrAirport.lat,
        arrivalLng: arrAirport.lng,
      },
    };

    return {
      code: 'Ok',
      routes: [route],
      waypoints: [
        { location: origin.coordinates, name: origin.name },
        { location: destination.coordinates, name: destination.name },
      ],
    };
  }

  /**
   * Find airport in same country as coordinates
   * Simple, reliable logic
   */
  private async findAirportInCountry(
    coordinates: { longitude: number; latitude: number },
    countryCode: string | null,
  ): Promise<{ iata: string; name: string; lat: number; lng: number } | null> {
    // Major airports by country
    const airportsByCountry: Record<
      string,
      Array<{ iata: string; name: string; lat: number; lng: number }>
    > = {
      us: [
        { iata: 'JFK', name: 'John F. Kennedy International', lat: 40.6413, lng: -73.7781 },
        { iata: 'LAX', name: 'Los Angeles International', lat: 33.9425, lng: -118.4081 },
        { iata: 'ORD', name: "Chicago O'Hare International", lat: 41.9742, lng: -87.9073 },
      ],
      gb: [
        { iata: 'LHR', name: 'London Heathrow', lat: 51.47, lng: -0.4543 },
        { iata: 'LGW', name: 'London Gatwick', lat: 51.1537, lng: -0.1821 },
      ],
      fr: [
        { iata: 'CDG', name: 'Paris Charles de Gaulle', lat: 49.0097, lng: 2.5479 },
        { iata: 'ORY', name: 'Paris Orly', lat: 48.7233, lng: 2.3794 },
      ],
      de: [
        { iata: 'FRA', name: 'Frankfurt Airport', lat: 50.0379, lng: 8.5622 },
        { iata: 'MUC', name: 'Munich Airport', lat: 48.3538, lng: 11.7861 },
      ],
      pl: [
        { iata: 'WAW', name: 'Warsaw Chopin', lat: 52.1657, lng: 20.9671 },
        { iata: 'KRK', name: 'Kraków John Paul II', lat: 50.0777, lng: 19.7848 },
      ],
      mg: [{ iata: 'TNR', name: 'Antananarivo Ivato', lat: -18.7969, lng: 47.4788 }],
      cn: [
        { iata: 'PEK', name: 'Beijing Capital', lat: 40.0801, lng: 116.5849 },
        { iata: 'PVG', name: 'Shanghai Pudong', lat: 31.1434, lng: 121.8052 },
      ],
      jp: [
        { iata: 'HND', name: 'Tokyo Haneda', lat: 35.5494, lng: 139.7798 },
        { iata: 'NRT', name: 'Tokyo Narita', lat: 35.772, lng: 140.3929 },
      ],
      // Add more countries as needed
    };

    // If country known, use country-specific airports
    if (countryCode && airportsByCountry[countryCode.toLowerCase()]) {
      const airports = airportsByCountry[countryCode.toLowerCase()];
      // Find closest airport in that country
      let closest = airports[0];
      let minDist = Infinity;

      for (const airport of airports) {
        const dist = this.calculateDistance(coordinates, {
          longitude: airport.lng,
          latitude: airport.lat,
        });
        if (dist < minDist) {
          minDist = dist;
          closest = airport;
        }
      }

      // Only return if within reasonable distance (500km)
      if (minDist < 500000) {
        return closest;
      }
    }

    // CRITICAL FIX: Remove dangerous global fallback
    // Google Maps never silently jumps continents - we must fail fast
    // If we can't find a nearby airport in the same country, return null
    // This will trigger proper error handling upstream
    return null;
  }

  /**
   * Calculate ground transport segment
   */
  private async calculateGroundSegment(
    from: { longitude: number; latitude: number },
    to: { longitude: number; latitude: number },
  ): Promise<{
    distance: number;
    duration: number;
    geometry: Array<{ longitude: number; latitude: number }>;
  } | null> {
    // Validate distance (max 500km for ground transport)
    const distance = this.calculateDistance(from, to);
    if (distance > 500000) {
      return null; // Too far for ground transport
    }

    try {
      const coordinates = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
      const url = `${this.mapboxApiUrl}/mapbox/driving/${coordinates}?access_token=${this.mapboxAccessToken}&geometries=geojson&overview=full`;

      const response = await firstValueFrom(this.httpService.get(url));
      const route = response.data.routes[0];

      return {
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry.coordinates.map((coord: [number, number]) => ({
          longitude: coord[0],
          latitude: coord[1],
        })),
      };
    } catch (error) {
      // Fallback: straight line estimate
      return {
        distance,
        duration: distance / 13.89, // ~50 km/h average
        geometry: [from, to],
      };
    }
  }

  /**
   * Get country code from coordinates
   * FIXED: Explicitly search for country context instead of assuming it's last
   */
  private async getCountry(coordinates: {
    longitude: number;
    latitude: number;
  }): Promise<string | null> {
    try {
      const results = await this.geocodingService.reverseGeocode(coordinates, 1);
      if (results && results.length > 0 && results[0].context) {
        // Search explicitly for country context (Mapbox doesn't guarantee order)
        const country = results[0].context.find((c: any) => c.id?.startsWith('country'));
        return country?.shortCode?.toLowerCase() || null;
      }
    } catch (error) {
      console.warn('Failed to get country:', error);
    }
    return null;
  }

  /**
   * Calculate distance between two points (meters)
   */
  private calculateDistance(
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
   * Estimate flight time (seconds)
   */
  private estimateFlightTime(distanceMeters: number): number {
    const distanceKm = distanceMeters / 1000;
    // Average commercial flight speed: ~800 km/h
    const speedKmh = 800;
    const hours = distanceKm / speedKmh;
    return hours * 3600;
  }

  /**
   * Generate flight path geometry
   */
  private generateFlightPath(
    from: { longitude: number; latitude: number },
    to: { longitude: number; latitude: number },
  ): Array<{ longitude: number; latitude: number }> {
    const points: Array<{ longitude: number; latitude: number }> = [];
    const numPoints = 20;

    for (let i = 0; i <= numPoints; i++) {
      const fraction = i / numPoints;
      const lat1 = (from.latitude * Math.PI) / 180;
      const lat2 = (to.latitude * Math.PI) / 180;
      const lon1 = (from.longitude * Math.PI) / 180;
      const lon2 = (to.longitude * Math.PI) / 180;

      const d = Math.acos(
        Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1),
      );

      const a = Math.sin((1 - fraction) * d) / Math.sin(d);
      const b = Math.sin(fraction * d) / Math.sin(d);

      const x = a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2);
      const y = a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2);
      const z = a * Math.sin(lat1) + b * Math.sin(lat2);

      const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
      const lon = Math.atan2(y, x);

      points.push({
        latitude: (lat * 180) / Math.PI,
        longitude: (lon * 180) / Math.PI,
      });
    }

    return points;
  }

  /**
   * Validate waypoints
   */
  private validateWaypoints(waypoints: RouteWaypoint[]): void {
    if (waypoints.length < 2) {
      throw new HttpException('At least two waypoints are required', HttpStatus.BAD_REQUEST);
    }

    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      if (!wp.coordinates) {
        throw new HttpException(`Waypoint ${i + 1} is missing coordinates`, HttpStatus.BAD_REQUEST);
      }
      if (
        typeof wp.coordinates.latitude !== 'number' ||
        typeof wp.coordinates.longitude !== 'number' ||
        isNaN(wp.coordinates.latitude) ||
        isNaN(wp.coordinates.longitude)
      ) {
        throw new HttpException(
          `Waypoint ${i + 1} has invalid coordinates`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  /**
   * Map profile to Mapbox profile
   */
  private mapProfileToMapbox(profile: RoutingProfile): string {
    const mapping: Record<RoutingProfile, string> = {
      driving: 'driving',
      'driving-traffic': 'driving-traffic',
      walking: 'walking',
      cycling: 'cycling',
      transit: 'driving',
      flight: 'driving',
    };
    return mapping[profile] || 'driving';
  }

  /**
   * Transform Mapbox response to our format
   */
  private transformMapboxResponse(mapboxData: any, waypoints: RouteWaypoint[]): RoutingResponse {
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
        steps: leg.steps.map((step: any) => ({
          distance: step.distance,
          duration: step.duration,
          instruction: step.maneuver?.instruction || step.instruction || '',
          maneuver: {
            type: step.maneuver?.type || 'turn',
            location: {
              longitude: step.maneuver?.location?.[0] || 0,
              latitude: step.maneuver?.location?.[1] || 0,
            },
          },
        })),
      })),
      weight: route.weight || route.duration,
      weightName: 'duration',
    }));

    return {
      code: mapboxData.code || 'Ok',
      routes,
      waypoints: mapboxData.waypoints.map((wp: any, index: number) => ({
        location: waypoints[index]?.coordinates || {
          longitude: wp.location[0],
          latitude: wp.location[1],
        },
        name: waypoints[index]?.name,
      })),
    };
  }

  // ============================================
  // AviationStack API Integration
  // ============================================

  /**
   * Search for flights using AviationStack API
   */
  async searchFlights(params: FlightSearchParams): Promise<FlightSearchResponse> {
    if (!this.aviationStackApiKey) {
      throw new HttpException(
        'Flight search service not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      const queryParams: Record<string, string> = {
        access_key: this.aviationStackApiKey,
      };

      // Map our params to AviationStack API params
      if (params.flightNumber) {
        queryParams.flight_iata = params.flightNumber.toUpperCase();
      }
      if (params.departureAirport) {
        queryParams.dep_iata = params.departureAirport.toUpperCase();
      }
      if (params.arrivalAirport) {
        queryParams.arr_iata = params.arrivalAirport.toUpperCase();
      }
      if (params.airlineIata) {
        queryParams.airline_iata = params.airlineIata.toUpperCase();
      }
      if (params.flightStatus) {
        queryParams.flight_status = params.flightStatus;
      }
      if (params.limit) {
        queryParams.limit = params.limit.toString();
      }
      if (params.offset) {
        queryParams.offset = params.offset.toString();
      }

      this.logger.debug(`Searching flights with params: ${JSON.stringify(params)}`);

      const response = await firstValueFrom(
        this.httpService.get(`${this.aviationStackApiUrl}/flights`, {
          params: queryParams,
        }),
      );

      // AviationStack returns errors in response body
      if (response.data.error) {
        this.logger.error(`AviationStack API error: ${response.data.error.info}`);
        throw new HttpException(
          response.data.error.info || 'Flight data unavailable',
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        flights: this.transformFlightData(response.data.data || []),
        pagination: response.data.pagination || {
          limit: params.limit || 100,
          offset: params.offset || 0,
          count: (response.data.data || []).length,
          total: (response.data.data || []).length,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(`Flight search failed: ${error.message}`);
      throw new HttpException('Failed to fetch flight data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Search for airports using AviationStack API
   */
  async searchAirports(params: AirportSearchParams): Promise<AirportSearchResponse> {
    if (!this.aviationStackApiKey) {
      throw new HttpException(
        'Airport search service not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      const queryParams: Record<string, string> = {
        access_key: this.aviationStackApiKey,
      };

      if (params.search) {
        queryParams.search = params.search;
      }
      if (params.countryCode) {
        queryParams.country_iso2 = params.countryCode.toUpperCase();
      }
      if (params.limit) {
        queryParams.limit = params.limit.toString();
      }
      if (params.offset) {
        queryParams.offset = params.offset.toString();
      }

      this.logger.debug(`Searching airports with params: ${JSON.stringify(params)}`);

      const response = await firstValueFrom(
        this.httpService.get(`${this.aviationStackApiUrl}/airports`, {
          params: queryParams,
        }),
      );

      // AviationStack returns errors in response body
      if (response.data.error) {
        this.logger.error(`AviationStack API error: ${response.data.error.info}`);
        throw new HttpException(
          response.data.error.info || 'Airport data unavailable',
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        airports: this.transformAirportData(response.data.data || []),
        pagination: response.data.pagination || {
          limit: params.limit || 100,
          offset: params.offset || 0,
          count: (response.data.data || []).length,
          total: (response.data.data || []).length,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(`Airport search failed: ${error.message}`);
      throw new HttpException('Failed to fetch airport data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Transform raw AviationStack flight data to our format
   */
  private transformFlightData(rawFlights: any[]): FlightData[] {
    return rawFlights.map((flight) => ({
      flightNumber: flight.flight?.iata || flight.flight?.icao || 'Unknown',
      airline: {
        name: flight.airline?.name || 'Unknown',
        iata: flight.airline?.iata || '',
        icao: flight.airline?.icao || '',
      },
      departure: {
        airport: flight.departure?.airport || 'Unknown',
        iata: flight.departure?.iata || '',
        icao: flight.departure?.icao || '',
        terminal: flight.departure?.terminal || null,
        gate: flight.departure?.gate || null,
        scheduled: flight.departure?.scheduled || null,
        estimated: flight.departure?.estimated || null,
        actual: flight.departure?.actual || null,
        timezone: flight.departure?.timezone || '',
      },
      arrival: {
        airport: flight.arrival?.airport || 'Unknown',
        iata: flight.arrival?.iata || '',
        icao: flight.arrival?.icao || '',
        terminal: flight.arrival?.terminal || null,
        gate: flight.arrival?.gate || null,
        scheduled: flight.arrival?.scheduled || null,
        estimated: flight.arrival?.estimated || null,
        actual: flight.arrival?.actual || null,
        timezone: flight.arrival?.timezone || '',
      },
      status: flight.flight_status || 'unknown',
      aircraft: flight.aircraft
        ? {
            registration: flight.aircraft.registration || '',
            iata: flight.aircraft.iata || '',
            icao: flight.aircraft.icao || '',
          }
        : null,
      live: flight.live
        ? {
            latitude: parseFloat(flight.live.latitude) || 0,
            longitude: parseFloat(flight.live.longitude) || 0,
            altitude: parseFloat(flight.live.altitude) || 0,
            speed: parseFloat(flight.live.speed_horizontal) || 0,
            direction: parseFloat(flight.live.direction) || 0,
            isGround: flight.live.is_ground || false,
            updated: flight.live.updated || '',
          }
        : null,
    }));
  }

  /**
   * Transform raw AviationStack airport data to our format
   */
  private transformAirportData(rawAirports: any[]): AirportData[] {
    return rawAirports.map((airport) => ({
      name: airport.airport_name || 'Unknown',
      iata: airport.iata_code || '',
      icao: airport.icao_code || '',
      city: airport.city_iata_code || '',
      country: airport.country_name || '',
      countryCode: airport.country_iso2 || '',
      latitude: parseFloat(airport.latitude) || 0,
      longitude: parseFloat(airport.longitude) || 0,
      timezone: airport.timezone || '',
    }));
  }
}
