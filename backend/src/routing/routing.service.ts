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
   * Search for flights using AviationStack API, with OpenSky fallback
   */
  async searchFlights(params: FlightSearchParams): Promise<FlightSearchResponse> {
    // Try AviationStack first if available
    if (this.aviationStackApiKey) {
      return this.searchFlightsWithAviationStack(params);
    }
    
    // Fallback to OpenSky for live flights
    this.logger.log('Using OpenSky fallback for flight search (AviationStack not configured)');
    return this.searchFlightsWithOpenSky(params);
  }

  /**
   * Search flights using AviationStack API
   */
  private async searchFlightsWithAviationStack(params: FlightSearchParams): Promise<FlightSearchResponse> {

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
   * Search flights using OpenSky API (fallback when AviationStack unavailable)
   */
  private async searchFlightsWithOpenSky(params: FlightSearchParams): Promise<FlightSearchResponse> {
    try {
      const openSkyBaseUrl = 'https://opensky-network.org/api';
      const now = Math.floor(Date.now() / 1000);
      const begin = now - 24 * 60 * 60; // Last 24 hours
      const end = now;

      // Get recent flights from OpenSky
      const response = await firstValueFrom(
        this.httpService.get(`${openSkyBaseUrl}/flights/all`, {
          params: { begin, end },
        }),
      );

      const flights = response.data || [];
      let filteredFlights = flights;

      // Filter by departure airport if provided
      if (params.departureAirport) {
        const depCode = params.departureAirport.toUpperCase();
        filteredFlights = filteredFlights.filter((f: any) => {
          const estDep = f.estDepartureAirport?.toUpperCase();
          return estDep === depCode || estDep?.includes(depCode);
        });
      }

      // Filter by arrival airport if provided
      if (params.arrivalAirport) {
        const arrCode = params.arrivalAirport.toUpperCase();
        filteredFlights = filteredFlights.filter((f: any) => {
          const estArr = f.estArrivalAirport?.toUpperCase();
          return estArr === arrCode || estArr?.includes(arrCode);
        });
      }

      // Filter by flight number if provided
      if (params.flightNumber) {
        const flightNum = params.flightNumber.toUpperCase();
        filteredFlights = filteredFlights.filter((f: any) => {
          const callsign = f.callsign?.toUpperCase();
          return callsign?.includes(flightNum);
        });
      }

      // Transform to our format
      const transformed = this.transformOpenSkyFlightData(filteredFlights);
      const limit = params.limit || 50;
      const offset = params.offset || 0;
      const paginated = transformed.slice(offset, offset + limit);

      return {
        flights: paginated,
        pagination: {
          limit,
          offset,
          count: paginated.length,
          total: transformed.length,
        },
      };
    } catch (error: any) {
      this.logger.error(`OpenSky flight search failed: ${error.message}`);
      throw new HttpException(
        'Failed to search flights. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Transform OpenSky flight data to our format
   */
  private transformOpenSkyFlightData(flights: any[]): FlightData[] {
    return flights
      .filter((f) => f.callsign && f.estDepartureAirport && f.estArrivalAirport)
      .map((flight) => {
        const depAirport = this.getAirportInfo(flight.estDepartureAirport);
        const arrAirport = this.getAirportInfo(flight.estArrivalAirport);

        return {
          flightNumber: flight.callsign?.trim() || 'Unknown',
          airline: {
            name: this.getAirlineFromCallsign(flight.callsign) || 'Unknown',
            iata: '',
            icao: '',
          },
          departure: {
            airport: depAirport.name,
            iata: depAirport.iata || '',
            icao: flight.estDepartureAirport || '',
            terminal: null,
            gate: null,
            scheduled: flight.firstSeen ? new Date(flight.firstSeen * 1000).toISOString() : null,
            estimated: null,
            actual: null,
            timezone: depAirport.timezone || '',
          },
          arrival: {
            airport: arrAirport.name,
            iata: arrAirport.iata || '',
            icao: flight.estArrivalAirport || '',
            terminal: null,
            gate: null,
            scheduled: flight.lastSeen ? new Date(flight.lastSeen * 1000).toISOString() : null,
            estimated: null,
            actual: null,
            timezone: arrAirport.timezone || '',
          },
          status: 'scheduled',
          aircraft: null,
          live: null,
        };
      });
  }

  /**
   * Get airport info from ICAO code
   */
  private getAirportInfo(icaoCode: string | null): { name: string; iata?: string; timezone?: string } {
    if (!icaoCode) return { name: 'Unknown' };

    const airportDatabase: Record<string, { name: string; iata?: string; timezone?: string }> = {
      'KJFK': { name: 'John F. Kennedy International', iata: 'JFK', timezone: 'America/New_York' },
      'KLAX': { name: 'Los Angeles International', iata: 'LAX', timezone: 'America/Los_Angeles' },
      'KORD': { name: "Chicago O'Hare International", iata: 'ORD', timezone: 'America/Chicago' },
      'KDFW': { name: 'Dallas/Fort Worth International', iata: 'DFW', timezone: 'America/Chicago' },
      'KDEN': { name: 'Denver International', iata: 'DEN', timezone: 'America/Denver' },
      'KSFO': { name: 'San Francisco International', iata: 'SFO', timezone: 'America/Los_Angeles' },
      'KSEA': { name: 'Seattle-Tacoma International', iata: 'SEA', timezone: 'America/Los_Angeles' },
      'KATL': { name: 'Hartsfield-Jackson Atlanta International', iata: 'ATL', timezone: 'America/New_York' },
      'KMIA': { name: 'Miami International', iata: 'MIA', timezone: 'America/New_York' },
      'KBOS': { name: 'Logan International', iata: 'BOS', timezone: 'America/New_York' },
      'KIAD': { name: 'Washington Dulles International', iata: 'IAD', timezone: 'America/New_York' },
      'KEWR': { name: 'Newark Liberty International', iata: 'EWR', timezone: 'America/New_York' },
      'KPHX': { name: 'Phoenix Sky Harbor International', iata: 'PHX', timezone: 'America/Phoenix' },
      'KLAS': { name: 'McCarran International', iata: 'LAS', timezone: 'America/Los_Angeles' },
      'KMSP': { name: 'Minneapolis-Saint Paul International', iata: 'MSP', timezone: 'America/Chicago' },
      'KDTW': { name: 'Detroit Metropolitan', iata: 'DTW', timezone: 'America/New_York' },
      'KCLT': { name: 'Charlotte Douglas International', iata: 'CLT', timezone: 'America/New_York' },
      'KPHL': { name: 'Philadelphia International', iata: 'PHL', timezone: 'America/New_York' },
      'KIAH': { name: 'George Bush Intercontinental', iata: 'IAH', timezone: 'America/Chicago' },
      'KSLC': { name: 'Salt Lake City International', iata: 'SLC', timezone: 'America/Denver' },
      'EGLL': { name: 'London Heathrow', iata: 'LHR', timezone: 'Europe/London' },
      'EGKK': { name: 'London Gatwick', iata: 'LGW', timezone: 'Europe/London' },
      'EGLC': { name: 'London City', iata: 'LCY', timezone: 'Europe/London' },
      'EGSS': { name: 'London Stansted', iata: 'STN', timezone: 'Europe/London' },
      'LFPG': { name: 'Paris Charles de Gaulle', iata: 'CDG', timezone: 'Europe/Paris' },
      'LFPB': { name: 'Paris Orly', iata: 'ORY', timezone: 'Europe/Paris' },
      'EDDF': { name: 'Frankfurt Airport', iata: 'FRA', timezone: 'Europe/Berlin' },
      'EDDM': { name: 'Munich Airport', iata: 'MUC', timezone: 'Europe/Berlin' },
      'EHAM': { name: 'Amsterdam Schiphol', iata: 'AMS', timezone: 'Europe/Amsterdam' },
      'EBBR': { name: 'Brussels Airport', iata: 'BRU', timezone: 'Europe/Brussels' },
      'LIRF': { name: 'Rome Fiumicino', iata: 'FCO', timezone: 'Europe/Rome' },
      'LIMC': { name: 'Milan Malpensa', iata: 'MXP', timezone: 'Europe/Rome' },
      'LEMD': { name: 'Madrid Barajas', iata: 'MAD', timezone: 'Europe/Madrid' },
      'LEBL': { name: 'Barcelona El Prat', iata: 'BCN', timezone: 'Europe/Madrid' },
      'LOWW': { name: 'Vienna International', iata: 'VIE', timezone: 'Europe/Vienna' },
      'LSZH': { name: 'Zurich Airport', iata: 'ZRH', timezone: 'Europe/Zurich' },
      'EPWA': { name: 'Warsaw Chopin', iata: 'WAW', timezone: 'Europe/Warsaw' },
      'EPKK': { name: 'Kraków John Paul II', iata: 'KRK', timezone: 'Europe/Warsaw' },
      'EKCH': { name: 'Copenhagen Kastrup', iata: 'CPH', timezone: 'Europe/Copenhagen' },
      'ESSA': { name: 'Stockholm Arlanda', iata: 'ARN', timezone: 'Europe/Stockholm' },
      'ENGM': { name: 'Oslo Gardermoen', iata: 'OSL', timezone: 'Europe/Oslo' },
      'EFHK': { name: 'Helsinki Vantaa', iata: 'HEL', timezone: 'Europe/Helsinki' },
      'LPPT': { name: 'Lisbon Portela', iata: 'LIS', timezone: 'Europe/Lisbon' },
      'OMDB': { name: 'Dubai International', iata: 'DXB', timezone: 'Asia/Dubai' },
      'OTHH': { name: 'Hamad International', iata: 'DOH', timezone: 'Asia/Qatar' },
      'OBBI': { name: 'Bahrain International', iata: 'BAH', timezone: 'Asia/Bahrain' },
      'OEJN': { name: 'King Abdulaziz International', iata: 'JED', timezone: 'Asia/Riyadh' },
      'OERK': { name: 'King Khalid International', iata: 'RUH', timezone: 'Asia/Riyadh' },
      'ZBAA': { name: 'Beijing Capital', iata: 'PEK', timezone: 'Asia/Shanghai' },
      'ZSPD': { name: 'Shanghai Pudong', iata: 'PVG', timezone: 'Asia/Shanghai' },
      'ZGGG': { name: 'Guangzhou Baiyun', iata: 'CAN', timezone: 'Asia/Shanghai' },
      'ZSSS': { name: 'Shanghai Hongqiao', iata: 'SHA', timezone: 'Asia/Shanghai' },
      'RJTT': { name: 'Tokyo Haneda', iata: 'HND', timezone: 'Asia/Tokyo' },
      'RJAA': { name: 'Tokyo Narita', iata: 'NRT', timezone: 'Asia/Tokyo' },
      'RJBB': { name: 'Kansai International', iata: 'KIX', timezone: 'Asia/Tokyo' },
      'RKSI': { name: 'Incheon International', iata: 'ICN', timezone: 'Asia/Seoul' },
      'WSSS': { name: 'Singapore Changi', iata: 'SIN', timezone: 'Asia/Singapore' },
      'VTBS': { name: 'Suvarnabhumi', iata: 'BKK', timezone: 'Asia/Bangkok' },
      'WMKK': { name: 'Kuala Lumpur International', iata: 'KUL', timezone: 'Asia/Kuala_Lumpur' },
      'VIDP': { name: 'Indira Gandhi International', iata: 'DEL', timezone: 'Asia/Kolkata' },
      'VABB': { name: 'Chhatrapati Shivaji Maharaj International', iata: 'BOM', timezone: 'Asia/Kolkata' },
      'VHHH': { name: 'Hong Kong International', iata: 'HKG', timezone: 'Asia/Hong_Kong' },
      'RCSS': { name: 'Taiwan Taoyuan International', iata: 'TPE', timezone: 'Asia/Taipei' },
      'YSSY': { name: 'Sydney Kingsford Smith', iata: 'SYD', timezone: 'Australia/Sydney' },
      'YMML': { name: 'Melbourne Airport', iata: 'MEL', timezone: 'Australia/Melbourne' },
      'YBBN': { name: 'Brisbane Airport', iata: 'BNE', timezone: 'Australia/Brisbane' },
      'YPPH': { name: 'Perth Airport', iata: 'PER', timezone: 'Australia/Perth' },
      'NZAA': { name: 'Auckland Airport', iata: 'AKL', timezone: 'Pacific/Auckland' },
      'SBGR': { name: 'São Paulo Guarulhos', iata: 'GRU', timezone: 'America/Sao_Paulo' },
      'SBGL': { name: 'Rio de Janeiro Galeão', iata: 'GIG', timezone: 'America/Sao_Paulo' },
      'SAEZ': { name: 'Buenos Aires Ezeiza', iata: 'EZE', timezone: 'America/Argentina/Buenos_Aires' },
      'SCEL': { name: 'Santiago International', iata: 'SCL', timezone: 'America/Santiago' },
      'SPIM': { name: 'Jorge Chávez International', iata: 'LIM', timezone: 'America/Lima' },
      'FAOR': { name: 'O.R. Tambo International', iata: 'JNB', timezone: 'Africa/Johannesburg' },
      'HECA': { name: 'Cairo International', iata: 'CAI', timezone: 'Africa/Cairo' },
      'FMMI': { name: 'Ivato International', iata: 'TNR', timezone: 'Indian/Antananarivo' },
      'DNMM': { name: 'Murtala Muhammed International', iata: 'LOS', timezone: 'Africa/Lagos' },
    };

    const upperCode = icaoCode.toUpperCase();
    return airportDatabase[upperCode] || { name: upperCode };
  }

  /**
   * Extract airline name from callsign (e.g., "UAL123" -> "United Airlines")
   */
  private getAirlineFromCallsign(callsign: string | null): string | null {
    if (!callsign) return null;

    const airlinePrefixes: Record<string, string> = {
      'UAL': 'United Airlines',
      'DAL': 'Delta Air Lines',
      'AAL': 'American Airlines',
      'SWA': 'Southwest Airlines',
      'JBU': 'JetBlue Airways',
      'ASA': 'Alaska Airlines',
      'BAW': 'British Airways',
      'AFR': 'Air France',
      'DLH': 'Lufthansa',
      'KLM': 'KLM Royal Dutch',
      'EZY': 'easyJet',
      'RYR': 'Ryanair',
      'UAE': 'Emirates',
      'QTR': 'Qatar Airways',
      'SIA': 'Singapore Airlines',
      'CPA': 'Cathay Pacific',
      'ANA': 'All Nippon Airways',
      'JAL': 'Japan Airlines',
      'QFA': 'Qantas',
      'THY': 'Turkish Airlines',
      'IBE': 'Iberia',
      'TAP': 'TAP Air Portugal',
      'SAS': 'Scandinavian Airlines',
      'FIN': 'Finnair',
      'ACA': 'Air Canada',
      'ETD': 'Etihad Airways',
    };

    const prefix = callsign.trim().substring(0, 3).toUpperCase();
    return airlinePrefixes[prefix] || null;
  }

  /**
   * Search for airports using AviationStack API, with static database fallback
   */
  async searchAirports(params: AirportSearchParams): Promise<AirportSearchResponse> {
    // Try AviationStack first if available
    if (this.aviationStackApiKey) {
      return this.searchAirportsWithAviationStack(params);
    }
    
    // Fallback to static airport database
    this.logger.log('Using static airport database (AviationStack not configured)');
    return this.searchAirportsFromDatabase(params);
  }

  /**
   * Search airports using AviationStack API
   */
  private async searchAirportsWithAviationStack(params: AirportSearchParams): Promise<AirportSearchResponse> {

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
   * Search airports from static database (fallback when AviationStack unavailable)
   */
  private async searchAirportsFromDatabase(params: AirportSearchParams): Promise<AirportSearchResponse> {
    const airports: AirportData[] = [
      // US Major Airports
      { name: 'John F. Kennedy International', iata: 'JFK', icao: 'KJFK', city: 'New York', country: 'United States', countryCode: 'US', latitude: 40.6413, longitude: -73.7781, timezone: 'America/New_York' },
      { name: 'Los Angeles International', iata: 'LAX', icao: 'KLAX', city: 'Los Angeles', country: 'United States', countryCode: 'US', latitude: 33.9425, longitude: -118.4081, timezone: 'America/Los_Angeles' },
      { name: "Chicago O'Hare International", iata: 'ORD', icao: 'KORD', city: 'Chicago', country: 'United States', countryCode: 'US', latitude: 41.9742, longitude: -87.9073, timezone: 'America/Chicago' },
      { name: 'Dallas/Fort Worth International', iata: 'DFW', icao: 'KDFW', city: 'Dallas', country: 'United States', countryCode: 'US', latitude: 32.8998, longitude: -97.0403, timezone: 'America/Chicago' },
      { name: 'Denver International', iata: 'DEN', icao: 'KDEN', city: 'Denver', country: 'United States', countryCode: 'US', latitude: 39.8561, longitude: -104.6737, timezone: 'America/Denver' },
      { name: 'San Francisco International', iata: 'SFO', icao: 'KSFO', city: 'San Francisco', country: 'United States', countryCode: 'US', latitude: 37.6213, longitude: -122.3790, timezone: 'America/Los_Angeles' },
      { name: 'Seattle-Tacoma International', iata: 'SEA', icao: 'KSEA', city: 'Seattle', country: 'United States', countryCode: 'US', latitude: 47.4502, longitude: -122.3088, timezone: 'America/Los_Angeles' },
      { name: 'Hartsfield-Jackson Atlanta International', iata: 'ATL', icao: 'KATL', city: 'Atlanta', country: 'United States', countryCode: 'US', latitude: 33.6407, longitude: -84.4277, timezone: 'America/New_York' },
      { name: 'Miami International', iata: 'MIA', icao: 'KMIA', city: 'Miami', country: 'United States', countryCode: 'US', latitude: 25.7959, longitude: -80.2870, timezone: 'America/New_York' },
      { name: 'Logan International', iata: 'BOS', icao: 'KBOS', city: 'Boston', country: 'United States', countryCode: 'US', latitude: 42.3656, longitude: -71.0096, timezone: 'America/New_York' },
      { name: 'Washington Dulles International', iata: 'IAD', icao: 'KIAD', city: 'Washington', country: 'United States', countryCode: 'US', latitude: 38.9445, longitude: -77.4558, timezone: 'America/New_York' },
      { name: 'Newark Liberty International', iata: 'EWR', icao: 'KEWR', city: 'Newark', country: 'United States', countryCode: 'US', latitude: 40.6925, longitude: -74.1687, timezone: 'America/New_York' },
      { name: 'Phoenix Sky Harbor International', iata: 'PHX', icao: 'KPHX', city: 'Phoenix', country: 'United States', countryCode: 'US', latitude: 33.4342, longitude: -112.0116, timezone: 'America/Phoenix' },
      { name: 'McCarran International', iata: 'LAS', icao: 'KLAS', city: 'Las Vegas', country: 'United States', countryCode: 'US', latitude: 36.0840, longitude: -115.1537, timezone: 'America/Los_Angeles' },
      { name: 'Minneapolis-Saint Paul International', iata: 'MSP', icao: 'KMSP', city: 'Minneapolis', country: 'United States', countryCode: 'US', latitude: 44.8848, longitude: -93.2223, timezone: 'America/Chicago' },
      { name: 'Detroit Metropolitan', iata: 'DTW', icao: 'KDTW', city: 'Detroit', country: 'United States', countryCode: 'US', latitude: 42.2162, longitude: -83.3554, timezone: 'America/New_York' },
      { name: 'Charlotte Douglas International', iata: 'CLT', icao: 'KCLT', city: 'Charlotte', country: 'United States', countryCode: 'US', latitude: 35.2144, longitude: -80.9473, timezone: 'America/New_York' },
      { name: 'Philadelphia International', iata: 'PHL', icao: 'KPHL', city: 'Philadelphia', country: 'United States', countryCode: 'US', latitude: 39.8719, longitude: -75.2411, timezone: 'America/New_York' },
      { name: 'George Bush Intercontinental', iata: 'IAH', icao: 'KIAH', city: 'Houston', country: 'United States', countryCode: 'US', latitude: 29.9844, longitude: -95.3414, timezone: 'America/Chicago' },
      { name: 'Salt Lake City International', iata: 'SLC', icao: 'KSLC', city: 'Salt Lake City', country: 'United States', countryCode: 'US', latitude: 40.7899, longitude: -111.9791, timezone: 'America/Denver' },
      
      // UK & Europe
      { name: 'London Heathrow', iata: 'LHR', icao: 'EGLL', city: 'London', country: 'United Kingdom', countryCode: 'GB', latitude: 51.4700, longitude: -0.4543, timezone: 'Europe/London' },
      { name: 'London Gatwick', iata: 'LGW', icao: 'EGKK', city: 'London', country: 'United Kingdom', countryCode: 'GB', latitude: 51.1537, longitude: -0.1821, timezone: 'Europe/London' },
      { name: 'London City', iata: 'LCY', icao: 'EGLC', city: 'London', country: 'United Kingdom', countryCode: 'GB', latitude: 51.5050, longitude: 0.0553, timezone: 'Europe/London' },
      { name: 'London Stansted', iata: 'STN', icao: 'EGSS', city: 'London', country: 'United Kingdom', countryCode: 'GB', latitude: 51.8860, longitude: 0.2389, timezone: 'Europe/London' },
      { name: 'Paris Charles de Gaulle', iata: 'CDG', icao: 'LFPG', city: 'Paris', country: 'France', countryCode: 'FR', latitude: 49.0097, longitude: 2.5479, timezone: 'Europe/Paris' },
      { name: 'Paris Orly', iata: 'ORY', icao: 'LFPB', city: 'Paris', country: 'France', countryCode: 'FR', latitude: 48.7233, longitude: 2.3794, timezone: 'Europe/Paris' },
      { name: 'Frankfurt Airport', iata: 'FRA', icao: 'EDDF', city: 'Frankfurt', country: 'Germany', countryCode: 'DE', latitude: 50.0379, longitude: 8.5622, timezone: 'Europe/Berlin' },
      { name: 'Munich Airport', iata: 'MUC', icao: 'EDDM', city: 'Munich', country: 'Germany', countryCode: 'DE', latitude: 48.3538, longitude: 11.7861, timezone: 'Europe/Berlin' },
      { name: 'Amsterdam Schiphol', iata: 'AMS', icao: 'EHAM', city: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', latitude: 52.3105, longitude: 4.7683, timezone: 'Europe/Amsterdam' },
      { name: 'Brussels Airport', iata: 'BRU', icao: 'EBBR', city: 'Brussels', country: 'Belgium', countryCode: 'BE', latitude: 50.9014, longitude: 4.4844, timezone: 'Europe/Brussels' },
      { name: 'Rome Fiumicino', iata: 'FCO', icao: 'LIRF', city: 'Rome', country: 'Italy', countryCode: 'IT', latitude: 41.8003, longitude: 12.2389, timezone: 'Europe/Rome' },
      { name: 'Milan Malpensa', iata: 'MXP', icao: 'LIMC', city: 'Milan', country: 'Italy', countryCode: 'IT', latitude: 45.6306, longitude: 8.7281, timezone: 'Europe/Rome' },
      { name: 'Madrid Barajas', iata: 'MAD', icao: 'LEMD', city: 'Madrid', country: 'Spain', countryCode: 'ES', latitude: 40.4839, longitude: -3.5680, timezone: 'Europe/Madrid' },
      { name: 'Barcelona El Prat', iata: 'BCN', icao: 'LEBL', city: 'Barcelona', country: 'Spain', countryCode: 'ES', latitude: 41.2971, longitude: 2.0785, timezone: 'Europe/Madrid' },
      { name: 'Vienna International', iata: 'VIE', icao: 'LOWW', city: 'Vienna', country: 'Austria', countryCode: 'AT', latitude: 48.1103, longitude: 16.5697, timezone: 'Europe/Vienna' },
      { name: 'Zurich Airport', iata: 'ZRH', icao: 'LSZH', city: 'Zurich', country: 'Switzerland', countryCode: 'CH', latitude: 47.4647, longitude: 8.5492, timezone: 'Europe/Zurich' },
      { name: 'Warsaw Chopin', iata: 'WAW', icao: 'EPWA', city: 'Warsaw', country: 'Poland', countryCode: 'PL', latitude: 52.1657, longitude: 20.9671, timezone: 'Europe/Warsaw' },
      { name: 'Kraków John Paul II', iata: 'KRK', icao: 'EPKK', city: 'Kraków', country: 'Poland', countryCode: 'PL', latitude: 50.0777, longitude: 19.7848, timezone: 'Europe/Warsaw' },
      { name: 'Copenhagen Kastrup', iata: 'CPH', icao: 'EKCH', city: 'Copenhagen', country: 'Denmark', countryCode: 'DK', latitude: 55.6180, longitude: 12.6500, timezone: 'Europe/Copenhagen' },
      { name: 'Stockholm Arlanda', iata: 'ARN', icao: 'ESSA', city: 'Stockholm', country: 'Sweden', countryCode: 'SE', latitude: 59.6519, longitude: 17.9186, timezone: 'Europe/Stockholm' },
      { name: 'Oslo Gardermoen', iata: 'OSL', icao: 'ENGM', city: 'Oslo', country: 'Norway', countryCode: 'NO', latitude: 60.1939, longitude: 11.1004, timezone: 'Europe/Oslo' },
      { name: 'Helsinki Vantaa', iata: 'HEL', icao: 'EFHK', city: 'Helsinki', country: 'Finland', countryCode: 'FI', latitude: 60.3172, longitude: 24.9633, timezone: 'Europe/Helsinki' },
      { name: 'Lisbon Portela', iata: 'LIS', icao: 'LPPT', city: 'Lisbon', country: 'Portugal', countryCode: 'PT', latitude: 38.7742, longitude: -9.1342, timezone: 'Europe/Lisbon' },
      
      // Middle East & Asia
      { name: 'Dubai International', iata: 'DXB', icao: 'OMDB', city: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', latitude: 25.2532, longitude: 55.3657, timezone: 'Asia/Dubai' },
      { name: 'Hamad International', iata: 'DOH', icao: 'OTHH', city: 'Doha', country: 'Qatar', countryCode: 'QA', latitude: 25.2611, longitude: 51.5651, timezone: 'Asia/Qatar' },
      { name: 'Bahrain International', iata: 'BAH', icao: 'OBBI', city: 'Manama', country: 'Bahrain', countryCode: 'BH', latitude: 26.2708, longitude: 50.6336, timezone: 'Asia/Bahrain' },
      { name: 'King Abdulaziz International', iata: 'JED', icao: 'OEJN', city: 'Jeddah', country: 'Saudi Arabia', countryCode: 'SA', latitude: 21.6796, longitude: 39.1565, timezone: 'Asia/Riyadh' },
      { name: 'King Khalid International', iata: 'RUH', icao: 'OERK', city: 'Riyadh', country: 'Saudi Arabia', countryCode: 'SA', latitude: 24.9576, longitude: 46.6988, timezone: 'Asia/Riyadh' },
      { name: 'Beijing Capital', iata: 'PEK', icao: 'ZBAA', city: 'Beijing', country: 'China', countryCode: 'CN', latitude: 40.0801, longitude: 116.5849, timezone: 'Asia/Shanghai' },
      { name: 'Shanghai Pudong', iata: 'PVG', icao: 'ZSPD', city: 'Shanghai', country: 'China', countryCode: 'CN', latitude: 31.1434, longitude: 121.8052, timezone: 'Asia/Shanghai' },
      { name: 'Guangzhou Baiyun', iata: 'CAN', icao: 'ZGGG', city: 'Guangzhou', country: 'China', countryCode: 'CN', latitude: 23.3924, longitude: 113.2988, timezone: 'Asia/Shanghai' },
      { name: 'Shanghai Hongqiao', iata: 'SHA', icao: 'ZSSS', city: 'Shanghai', country: 'China', countryCode: 'CN', latitude: 31.1979, longitude: 121.3363, timezone: 'Asia/Shanghai' },
      { name: 'Tokyo Haneda', iata: 'HND', icao: 'RJTT', city: 'Tokyo', country: 'Japan', countryCode: 'JP', latitude: 35.5494, longitude: 139.7798, timezone: 'Asia/Tokyo' },
      { name: 'Tokyo Narita', iata: 'NRT', icao: 'RJAA', city: 'Tokyo', country: 'Japan', countryCode: 'JP', latitude: 35.7720, longitude: 140.3929, timezone: 'Asia/Tokyo' },
      { name: 'Kansai International', iata: 'KIX', icao: 'RJBB', city: 'Osaka', country: 'Japan', countryCode: 'JP', latitude: 34.4273, longitude: 135.2441, timezone: 'Asia/Tokyo' },
      { name: 'Incheon International', iata: 'ICN', icao: 'RKSI', city: 'Seoul', country: 'South Korea', countryCode: 'KR', latitude: 37.4602, longitude: 126.4407, timezone: 'Asia/Seoul' },
      { name: 'Singapore Changi', iata: 'SIN', icao: 'WSSS', city: 'Singapore', country: 'Singapore', countryCode: 'SG', latitude: 1.3644, longitude: 103.9915, timezone: 'Asia/Singapore' },
      { name: 'Suvarnabhumi', iata: 'BKK', icao: 'VTBS', city: 'Bangkok', country: 'Thailand', countryCode: 'TH', latitude: 13.6811, longitude: 100.7473, timezone: 'Asia/Bangkok' },
      { name: 'Kuala Lumpur International', iata: 'KUL', icao: 'WMKK', city: 'Kuala Lumpur', country: 'Malaysia', countryCode: 'MY', latitude: 2.7456, longitude: 101.7099, timezone: 'Asia/Kuala_Lumpur' },
      { name: 'Indira Gandhi International', iata: 'DEL', icao: 'VIDP', city: 'New Delhi', country: 'India', countryCode: 'IN', latitude: 28.5562, longitude: 77.1000, timezone: 'Asia/Kolkata' },
      { name: 'Chhatrapati Shivaji Maharaj International', iata: 'BOM', icao: 'VABB', city: 'Mumbai', country: 'India', countryCode: 'IN', latitude: 19.0897, longitude: 72.8656, timezone: 'Asia/Kolkata' },
      { name: 'Hong Kong International', iata: 'HKG', icao: 'VHHH', city: 'Hong Kong', country: 'Hong Kong', countryCode: 'HK', latitude: 22.3080, longitude: 113.9185, timezone: 'Asia/Hong_Kong' },
      { name: 'Taiwan Taoyuan International', iata: 'TPE', icao: 'RCSS', city: 'Taipei', country: 'Taiwan', countryCode: 'TW', latitude: 25.0797, longitude: 121.2342, timezone: 'Asia/Taipei' },
      
      // Oceania
      { name: 'Sydney Kingsford Smith', iata: 'SYD', icao: 'YSSY', city: 'Sydney', country: 'Australia', countryCode: 'AU', latitude: -33.9399, longitude: 151.1753, timezone: 'Australia/Sydney' },
      { name: 'Melbourne Airport', iata: 'MEL', icao: 'YMML', city: 'Melbourne', country: 'Australia', countryCode: 'AU', latitude: -37.6733, longitude: 144.8433, timezone: 'Australia/Melbourne' },
      { name: 'Brisbane Airport', iata: 'BNE', icao: 'YBBN', city: 'Brisbane', country: 'Australia', countryCode: 'AU', latitude: -27.3842, longitude: 153.1171, timezone: 'Australia/Brisbane' },
      { name: 'Perth Airport', iata: 'PER', icao: 'YPPH', city: 'Perth', country: 'Australia', countryCode: 'AU', latitude: -31.9403, longitude: 115.9669, timezone: 'Australia/Perth' },
      { name: 'Auckland Airport', iata: 'AKL', icao: 'NZAA', city: 'Auckland', country: 'New Zealand', countryCode: 'NZ', latitude: -37.0082, longitude: 174.7850, timezone: 'Pacific/Auckland' },
      
      // South America
      { name: 'São Paulo Guarulhos', iata: 'GRU', icao: 'SBGR', city: 'São Paulo', country: 'Brazil', countryCode: 'BR', latitude: -23.4356, longitude: -46.4731, timezone: 'America/Sao_Paulo' },
      { name: 'Rio de Janeiro Galeão', iata: 'GIG', icao: 'SBGL', city: 'Rio de Janeiro', country: 'Brazil', countryCode: 'BR', latitude: -22.8089, longitude: -43.2436, timezone: 'America/Sao_Paulo' },
      { name: 'Buenos Aires Ezeiza', iata: 'EZE', icao: 'SAEZ', city: 'Buenos Aires', country: 'Argentina', countryCode: 'AR', latitude: -34.8222, longitude: -58.5358, timezone: 'America/Argentina/Buenos_Aires' },
      { name: 'Santiago International', iata: 'SCL', icao: 'SCEL', city: 'Santiago', country: 'Chile', countryCode: 'CL', latitude: -33.3930, longitude: -70.7858, timezone: 'America/Santiago' },
      { name: 'Jorge Chávez International', iata: 'LIM', icao: 'SPIM', city: 'Lima', country: 'Peru', countryCode: 'PE', latitude: -12.0219, longitude: -77.1143, timezone: 'America/Lima' },
      
      // Africa
      { name: 'O.R. Tambo International', iata: 'JNB', icao: 'FAOR', city: 'Johannesburg', country: 'South Africa', countryCode: 'ZA', latitude: -26.1392, longitude: 28.2460, timezone: 'Africa/Johannesburg' },
      { name: 'Cairo International', iata: 'CAI', icao: 'HECA', city: 'Cairo', country: 'Egypt', countryCode: 'EG', latitude: 30.1127, longitude: 31.4000, timezone: 'Africa/Cairo' },
      { name: 'Ivato International', iata: 'TNR', icao: 'FMMI', city: 'Antananarivo', country: 'Madagascar', countryCode: 'MG', latitude: -18.7969, longitude: 47.4788, timezone: 'Indian/Antananarivo' },
      { name: 'Murtala Muhammed International', iata: 'LOS', icao: 'DNMM', city: 'Lagos', country: 'Nigeria', countryCode: 'NG', latitude: 6.5774, longitude: 3.3211, timezone: 'Africa/Lagos' },
    ];

    let filtered = airports;

    // Filter by search term
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(
        (airport) =>
          airport.name.toLowerCase().includes(searchLower) ||
          airport.iata.toLowerCase().includes(searchLower) ||
          airport.icao.toLowerCase().includes(searchLower) ||
          airport.city.toLowerCase().includes(searchLower),
      );
    }

    // Filter by country code
    if (params.countryCode) {
      filtered = filtered.filter(
        (airport) => airport.countryCode.toLowerCase() === params.countryCode?.toLowerCase(),
      );
    }

    const limit = params.limit || 100;
    const offset = params.offset || 0;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      airports: paginated,
      pagination: {
        limit,
        offset,
        count: paginated.length,
        total: filtered.length,
      },
    };
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
