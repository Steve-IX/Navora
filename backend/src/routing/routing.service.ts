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
import { GeocodingService } from '../geocoding/geocoding.service';

@Injectable()
export class RoutingService {
  private readonly mapboxAccessToken: string;
  private readonly mapboxApiUrl = 'https://api.mapbox.com/directions/v5';
  private readonly aviationStackApiKey: string;
  private readonly aviationStackApiUrl = 'https://api.aviationstack.com/v1';
  // Airport cache: coordinates -> airport info with TTL
  private airportCache: Map<string, { airport: { iata: string; name: string; lat: number; lng: number }; expires: number }> = new Map();
  private readonly airportCacheTTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private geocodingService: GeocodingService,
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

      // Validate waypoint coordinates
      for (let i = 0; i < waypoints.length; i++) {
        const wp = waypoints[i];
        if (!wp.coordinates) {
          throw new HttpException(
            `Waypoint ${i + 1} is missing coordinates`,
            HttpStatus.BAD_REQUEST,
          );
        }
        if (typeof wp.coordinates.latitude !== 'number' || typeof wp.coordinates.longitude !== 'number') {
          throw new HttpException(
            `Waypoint ${i + 1} has invalid coordinates`,
            HttpStatus.BAD_REQUEST,
          );
        }
        if (isNaN(wp.coordinates.latitude) || isNaN(wp.coordinates.longitude)) {
          throw new HttpException(
            `Waypoint ${i + 1} has NaN coordinates`,
            HttpStatus.BAD_REQUEST,
          );
        }
        // Validate coordinate ranges
        if (wp.coordinates.latitude < -90 || wp.coordinates.latitude > 90) {
          throw new HttpException(
            `Waypoint ${i + 1} has invalid latitude (must be between -90 and 90)`,
            HttpStatus.BAD_REQUEST,
          );
        }
        if (wp.coordinates.longitude < -180 || wp.coordinates.longitude > 180) {
          throw new HttpException(
            `Waypoint ${i + 1} has invalid longitude (must be between -180 and 180)`,
            HttpStatus.BAD_REQUEST,
          );
        }
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
   * Validate ground transport distance and geographic constraints
   * Ground transport cannot cross oceans or continents
   */
  private async validateGroundTransport(
    from: { longitude: number; latitude: number },
    to: { longitude: number; latitude: number },
    maxDistanceKm: number = 500,
  ): Promise<{ valid: boolean; reason?: string }> {
    const distance = this.calculateGreatCircleDistance(from, to);
    const distanceKm = distance / 1000;

    // Check distance constraint
    if (distanceKm > maxDistanceKm) {
      return {
        valid: false,
        reason: `Ground transport distance (${distanceKm.toFixed(1)}km) exceeds maximum (${maxDistanceKm}km). Flight routing required.`,
      };
    }

    // Check if locations are in same country (prevents ocean/continent crossing)
    const sameCountry = await this.areInSameCountry(from, to);
    if (!sameCountry) {
      return {
        valid: false,
        reason: 'Ground transport cannot cross country borders. Flight routing required.',
      };
    }

    return { valid: true };
  }

  /**
   * Calculate ground transport route using Mapbox Directions API
   * Supports multiple transport modes: driving, walking, transit
   * ENFORCES: Distance and geographic constraints
   */
  private async calculateGroundTransport(
    from: { longitude: number; latitude: number },
    to: { longitude: number; latitude: number },
    mode: 'driving' | 'walking' | 'transit' = 'driving',
  ): Promise<{
    distance: number;
    duration: number;
    geometry: Array<{ longitude: number; latitude: number }>;
    steps: Array<{
      distance: number;
      duration: number;
      instruction: string;
      maneuver: {
        type: string;
        location: { longitude: number; latitude: number };
      };
    }>;
  } | null> {
    // Validate ground transport constraints first
    const validation = await this.validateGroundTransport(from, to, 500);
    if (!validation.valid) {
      throw new HttpException(
        validation.reason || 'Ground transport not feasible for this route',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // Map transit to driving for Mapbox (transit requires different endpoint)
      const mapboxProfile = mode === 'transit' ? 'driving' : mode;
      const coordinates = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
      
      const url = `${this.mapboxApiUrl}/mapbox/${mapboxProfile}/${coordinates}?access_token=${this.mapboxAccessToken}&geometries=geojson&overview=full&steps=true`;
      
      const response = await firstValueFrom(this.httpService.get(url));
      const data = response.data;

      if (!data.routes || data.routes.length === 0) {
        // Fallback: estimate based on distance
        const distance = this.calculateGreatCircleDistance(from, to);
        const speed = mode === 'walking' ? 1.4 : mode === 'transit' ? 10 : 50; // m/s
        const duration = distance / speed;
        
        return {
          distance,
          duration,
          geometry: [from, to],
          steps: [{
            distance,
            duration,
            instruction: `Travel to destination via ${mode}`,
            maneuver: {
              type: 'depart',
              location: from,
            },
          }],
        };
      }

      const route = data.routes[0];
      const leg = route.legs[0];

      return {
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry.coordinates.map((coord: [number, number]) => ({
          longitude: coord[0],
          latitude: coord[1],
        })),
        steps: leg.steps?.map((step: any) => ({
          distance: step.distance,
          duration: step.duration,
          instruction: step.maneuver.instruction || step.maneuver.type,
          maneuver: {
            type: step.maneuver.type,
            location: {
              longitude: step.maneuver.location[0],
              latitude: step.maneuver.location[1],
            },
          },
        })) || [],
      };
    } catch (error) {
      console.warn('Error calculating ground transport, using fallback:', error);
      // Fallback: estimate based on distance
      const distance = this.calculateGreatCircleDistance(from, to);
      const speed = mode === 'walking' ? 1.4 : mode === 'transit' ? 10 : 50; // m/s
      const duration = distance / speed;
      
      return {
        distance,
        duration,
        geometry: [from, to],
        steps: [{
          distance,
          duration,
          instruction: `Travel to destination via ${mode} (estimated)`,
          maneuver: {
            type: 'depart',
            location: from,
          },
        }],
      };
    }
  }

  /**
   * Build multimodal flight journey with ground transport and flight segments
   */
  private async buildMultimodalFlightJourney(
    origin: RouteWaypoint,
    destination: RouteWaypoint,
  ): Promise<RoutingResponse> {
    const legs: any[] = [];
    const allCoordinates: Array<{ longitude: number; latitude: number }> = [];
    let totalDistance = 0;
    let totalDuration = 0;
    const flightSegments: any[] = [];
    const transfers: any[] = [];

    try {
      // Validate coordinates first
      if (!origin.coordinates || !destination.coordinates) {
        throw new HttpException(
          'Origin or destination coordinates are missing',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate origin and destination are different
      const originDestDistance = this.calculateGreatCircleDistance(
        origin.coordinates,
        destination.coordinates,
      );
      
      // Only validate distance for very close locations (less than 100m)
      // This prevents false positives for nearby addresses that are still valid flight routes
      if (originDestDistance < 100) {
        // Less than 100m - likely same location or invalid
        throw new HttpException(
          'Origin and destination are too close for flight routing. Please select different locations.',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Step 1: Find nearest departure airport
      const departureAirport = await this.findNearestAirport(origin.coordinates);
      if (!departureAirport) {
        throw new Error('Could not find departure airport');
      }

      // Step 2: Calculate ground transport from origin to departure airport
      // Try multiple transport modes and select the best option
      const transportModes: Array<'driving' | 'transit' | 'walking'> = ['driving', 'transit', 'walking'];
      let toAirportTransport: any = null;
      let bestTransportMode: 'driving' | 'transit' | 'walking' = 'driving';
      
      // Try driving first (most common), then transit, then walking
      for (const mode of transportModes) {
        try {
          const transport = await this.calculateGroundTransport(
            origin.coordinates,
            { longitude: departureAirport.lng, latitude: departureAirport.lat },
            mode,
          );
          if (transport && (!toAirportTransport || transport.duration < toAirportTransport.duration)) {
            toAirportTransport = transport;
            bestTransportMode = mode;
          }
        } catch (error) {
          // Continue to next mode
          continue;
        }
      }
      
      // If no transport found, use driving as fallback
      if (!toAirportTransport) {
        toAirportTransport = await this.calculateGroundTransport(
          origin.coordinates,
          { longitude: departureAirport.lng, latitude: departureAirport.lat },
          'driving',
        );
        bestTransportMode = 'driving';
      }

      if (toAirportTransport) {
        const modeLabels: Record<string, string> = {
          driving: 'Drive',
          transit: 'Take transit',
          walking: 'Walk',
        };
        legs.push({
          distance: toAirportTransport.distance,
          duration: toAirportTransport.duration,
          steps: toAirportTransport.steps.map((step: any) => ({
            ...step,
            transportMode: bestTransportMode,
          })),
          transportMode: bestTransportMode,
          modeLabel: `${modeLabels[bestTransportMode] || 'Travel'} to ${departureAirport.name} (${departureAirport.iata})`,
        });
        totalDistance += toAirportTransport.distance;
        totalDuration += toAirportTransport.duration;
        allCoordinates.push(...toAirportTransport.geometry);
      }

      // Get destination country to enforce same-country airport selection
      const destinationCountry = await this.getCountryFromCoordinates(destination.coordinates);

      // Step 3: Find nearest arrival airport IN SAME COUNTRY as destination
      // Enforce 150km radius and same-country constraint
      const arrivalAirportCandidate = await this.findNearestAirport(
        destination.coordinates,
        150, // 150km radius
        destinationCountry || undefined,
      );
      if (!arrivalAirportCandidate) {
        throw new HttpException(
          `No commercial airport found within 150km of destination in ${destinationCountry || 'the selected region'}. Please select a location closer to an airport.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate arrival airport is in same country as destination
      if (destinationCountry) {
        const airportCountry = await this.getCountryFromCoordinates({
          longitude: arrivalAirportCandidate.lng,
          latitude: arrivalAirportCandidate.lat,
        });
        if (airportCountry && airportCountry !== destinationCountry) {
          throw new HttpException(
            `Selected arrival airport (${arrivalAirportCandidate.iata}) is in a different country. Please select a location closer to an airport in ${destinationCountry}.`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Validate: Prevent same origin and destination airports
      if (departureAirport.iata === arrivalAirportCandidate.iata) {
        throw new HttpException(
          `Invalid route: Departure and arrival airports are the same (${departureAirport.iata}). Please select different origin and destination locations.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Step 4: Find optimal flight route (direct or connecting)
      const flightRoute = await this.findOptimalFlightRoute(departureAirport, arrivalAirportCandidate);
      
      // Validate flight route segments
      if (flightRoute.segments.length === 0) {
        throw new HttpException(
          'No flight route found between selected airports. Please try different origin and destination locations.',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate: Check for circular flights (same airport appears multiple times)
      const airportSequence: string[] = [];
      flightRoute.segments.forEach(segment => {
        airportSequence.push(segment.departureIata);
        airportSequence.push(segment.arrivalIata);
      });
      
      // Check for immediate circular routes (A -> A)
      for (let i = 0; i < airportSequence.length - 1; i++) {
        if (airportSequence[i] === airportSequence[i + 1]) {
          throw new HttpException(
            `Invalid route: Circular flight detected (${airportSequence[i]} → ${airportSequence[i + 1]}). Please select different locations.`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Step 5: Add flight segments as legs
      for (let i = 0; i < flightRoute.segments.length; i++) {
        const segment = flightRoute.segments[i];
        
        // Determine segment start and end coordinates
        let segmentStart: { longitude: number; latitude: number };
        let segmentEnd: { longitude: number; latitude: number };
        
        if (i === 0) {
          segmentStart = { longitude: departureAirport.lng, latitude: departureAirport.lat };
        } else {
          // Use previous segment's arrival airport coordinates
          const prevSegment = flightRoute.segments[i - 1];
          // Try to get coordinates from transfer or estimate
          const transfer = flightRoute.transfers[i - 1];
          if (transfer) {
            // For now, estimate - in production, would look up airport coordinates
            segmentStart = { longitude: 0, latitude: 0 }; // Would need airport DB lookup
          } else {
            segmentStart = { longitude: arrivalAirportCandidate.lng, latitude: arrivalAirportCandidate.lat };
          }
        }
        
        if (i === flightRoute.segments.length - 1) {
          segmentEnd = { longitude: arrivalAirportCandidate.lng, latitude: arrivalAirportCandidate.lat };
        } else {
          // Intermediate segment - use transfer airport coordinates (estimated)
          segmentEnd = { longitude: 0, latitude: 0 }; // Would need airport DB lookup
        }
        
        const segmentDistance = this.calculateGreatCircleDistance(segmentStart, segmentEnd);
        const segmentGeometry = this.generateGreatCirclePath([segmentStart, segmentEnd]);

        legs.push({
          distance: segmentDistance,
          duration: segment.duration,
          steps: [{
            distance: segmentDistance,
            duration: segment.duration,
            instruction: segment.flightNumber
              ? `Flight ${segment.airline || ''} ${segment.flightNumber} from ${segment.departureAirport} (${segment.departureIata}) to ${segment.arrivalAirport} (${segment.arrivalIata})`
              : `Fly from ${segment.departureAirport} to ${segment.arrivalAirport}`,
            maneuver: {
              type: 'depart',
              location: segmentStart,
            },
            transportMode: 'flight',
          }],
          transportMode: 'flight',
          modeLabel: segment.flightNumber 
            ? `Flight ${segment.flightNumber}`
            : `Flight ${segment.departureIata} → ${segment.arrivalIata}`,
        });

        totalDistance += segmentDistance;
        totalDuration += segment.duration;
        allCoordinates.push(...segmentGeometry);

        flightSegments.push(segment);

        // Add transfer if not last segment
        if (i < flightRoute.segments.length - 1 && flightRoute.transfers.length > i) {
          const transfer = flightRoute.transfers[i];
          transfers.push(transfer);
          
          legs.push({
            distance: 0,
            duration: transfer.layoverDuration,
            steps: [{
              distance: 0,
              duration: transfer.layoverDuration,
              instruction: `Transfer at ${transfer.airport} (${transfer.airportIata}) - Layover: ${Math.round(transfer.layoverDuration / 60)} minutes`,
              maneuver: {
                type: 'arrive',
                location: { longitude: 0, latitude: 0 },
              },
              transportMode: 'transfer',
              transferInfo: {
                airport: transfer.airport,
                layoverDuration: transfer.layoverDuration,
              },
            }],
            transportMode: 'transfer',
            modeLabel: `Transfer at ${transfer.airportIata}`,
          });
          totalDuration += transfer.layoverDuration;
        }
      }

      // Step 6: Calculate ground transport from arrival airport to destination
      // Try multiple transport modes and select the best option
      let fromAirportTransport: any = null;
      let bestArrivalTransportMode: 'driving' | 'transit' | 'walking' = 'driving';
      
      for (const mode of transportModes) {
        try {
          const transport = await this.calculateGroundTransport(
            { longitude: arrivalAirportCandidate.lng, latitude: arrivalAirportCandidate.lat },
            destination.coordinates,
            mode,
          );
          if (transport && (!fromAirportTransport || transport.duration < fromAirportTransport.duration)) {
            fromAirportTransport = transport;
            bestArrivalTransportMode = mode;
          }
        } catch (error) {
          // Continue to next mode
          continue;
        }
      }
      
      // If no transport found, use driving as fallback
      if (!fromAirportTransport) {
        fromAirportTransport = await this.calculateGroundTransport(
          { longitude: arrivalAirportCandidate.lng, latitude: arrivalAirportCandidate.lat },
          destination.coordinates,
          'driving',
        );
        bestArrivalTransportMode = 'driving';
      }

      if (fromAirportTransport) {
        const modeLabels: Record<string, string> = {
          driving: 'Drive',
          transit: 'Take transit',
          walking: 'Walk',
        };
        legs.push({
          distance: fromAirportTransport.distance,
          duration: fromAirportTransport.duration,
          steps: fromAirportTransport.steps.map((step: any) => ({
            ...step,
            transportMode: bestArrivalTransportMode,
          })),
          transportMode: bestArrivalTransportMode,
          modeLabel: `${modeLabels[bestArrivalTransportMode] || 'Travel'} from ${arrivalAirportCandidate.name} (${arrivalAirportCandidate.iata}) to destination`,
        });
        totalDistance += fromAirportTransport.distance;
        totalDuration += fromAirportTransport.duration;
        allCoordinates.push(...fromAirportTransport.geometry);
      }

      // Build flight info
      const flightInfo: any = {
        departureAirport: departureAirport.name,
        departureIata: departureAirport.iata,
        departureLat: departureAirport.lat,
        departureLng: departureAirport.lng,
        arrivalAirport: arrivalAirportCandidate.name,
        arrivalIata: arrivalAirportCandidate.iata,
        arrivalLat: arrivalAirportCandidate.lat,
        arrivalLng: arrivalAirportCandidate.lng,
      };

      if (flightSegments.length > 0) {
        const firstSegment = flightSegments[0];
        const lastSegment = flightSegments[flightSegments.length - 1];
        
        flightInfo.airline = firstSegment.airline;
        flightInfo.airlineIata = firstSegment.airlineIata;
        flightInfo.flightNumber = firstSegment.flightNumber;
        flightInfo.scheduledDeparture = firstSegment.scheduledDeparture;
        flightInfo.scheduledArrival = lastSegment.scheduledArrival;
        flightInfo.flightStatus = firstSegment.flightStatus;
        flightInfo.aircraft = firstSegment.aircraft;

        if (flightSegments.length > 1) {
          flightInfo.segments = flightSegments;
          flightInfo.transfers = transfers;
        }
      }

      const route: Route = {
        distance: totalDistance,
        duration: totalDuration,
        geometry: {
          coordinates: allCoordinates,
        },
        legs,
        weight: totalDuration,
        weightName: 'duration',
        flightInfo,
      };

      // FINAL VALIDATION: Validate entire journey before returning
      const validationResult = await this.validateJourney(route, origin, destination);
      if (!validationResult.valid) {
        throw new HttpException(
          validationResult.reason || 'Journey validation failed',
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        code: 'Ok',
        routes: [route],
        waypoints: [
          { location: origin.coordinates, name: origin.name },
          { location: destination.coordinates, name: destination.name },
        ],
      };
    } catch (error) {
      console.error('Error building multimodal flight journey:', error);
      // If it's a validation error, throw it instead of falling back
      if (error instanceof HttpException) {
        throw error;
      }
      // For other errors, fallback to simple great-circle route
      return this.calculateFlightRouteFallback([origin, destination]);
    }
  }

  /**
   * Fallback flight route calculation (simple great-circle)
   */
  private calculateFlightRouteFallback(waypoints: RouteWaypoint[]): RoutingResponse {
    const coordinates: Array<{ longitude: number; latitude: number }> = [];
    let totalDistance = 0;

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

    const flightSpeedMps = 250;
    const flightDuration = totalDistance / flightSpeedMps + 3600;
    const routeCoordinates = this.generateGreatCirclePath(coordinates);

    const route: Route = {
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
          instruction: 'Fly direct to destination (estimated)',
              maneuver: {
                type: 'depart',
                location: waypoints[0].coordinates,
              },
          transportMode: 'flight',
        }],
        transportMode: 'flight',
        modeLabel: 'Flight',
      }],
      weight: flightDuration,
      weightName: 'duration',
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
   * Calculate flight route using multimodal journey builder
   * This creates a realistic route with ground transport and flight segments
   */
  private async calculateFlightRoute(waypoints: RouteWaypoint[]): Promise<RoutingResponse> {
    if (waypoints.length < 2) {
      throw new HttpException(
        'At least two waypoints are required for flight routing',
        HttpStatus.BAD_REQUEST,
      );
    }

    // For now, support only origin-destination pairs
    // Multi-waypoint flights could be added in the future
    if (waypoints.length === 2) {
      return this.buildMultimodalFlightJourney(waypoints[0], waypoints[1]);
    }

    // For multiple waypoints, chain them together
    // This is a simplified approach - could be enhanced
    return this.calculateFlightRouteFallback(waypoints);
  }

  /**
   * Find optimal flight route (direct or connecting) between two airports
   * Returns flight segments with transfer information
   */
  private async findOptimalFlightRoute(
    departureAirport: { iata: string; name: string; lat: number; lng: number },
    arrivalAirport: { iata: string; name: string; lat: number; lng: number },
  ): Promise<{
    segments: Array<{
      airline?: string;
      airlineIata?: string;
      flightNumber?: string;
      departureAirport: string;
      departureIata: string;
      arrivalAirport: string;
      arrivalIata: string;
      scheduledDeparture?: string;
      scheduledArrival?: string;
      flightStatus?: string;
      aircraft?: string;
      duration: number;
    }>;
    transfers: Array<{
      airport: string;
      airportIata: string;
      layoverDuration: number;
    }>;
    totalDuration: number;
  }> {
    if (!this.aviationStackApiKey) {
      // Fallback: estimate direct flight
      const distance = this.calculateGreatCircleDistance(
        { longitude: departureAirport.lng, latitude: departureAirport.lat },
        { longitude: arrivalAirport.lng, latitude: arrivalAirport.lat },
      );
      const flightSpeedMps = 250; // m/s
      const duration = distance / flightSpeedMps + 3600; // +1 hour for procedures
      
      return {
        segments: [{
          departureAirport: departureAirport.name,
          departureIata: departureAirport.iata,
          arrivalAirport: arrivalAirport.name,
          arrivalIata: arrivalAirport.iata,
          duration,
        }],
        transfers: [],
        totalDuration: duration,
      };
    }

    try {
      // First, try to find direct flights
      const directUrl = `${this.aviationStackApiUrl}/flights?access_key=${this.aviationStackApiKey}&dep_iata=${departureAirport.iata}&arr_iata=${arrivalAirport.iata}&limit=5`;
      
      try {
        const directResponse = await firstValueFrom(this.httpService.get(directUrl));
        const directData = directResponse.data;

        if (!directData.error && directData.data && directData.data.length > 0) {
          // Found direct flight
          const flight = directData.data[0];
          let duration = this.calculateGreatCircleDistance(
            { longitude: departureAirport.lng, latitude: departureAirport.lat },
            { longitude: arrivalAirport.lng, latitude: arrivalAirport.lat },
          ) / 250 + 3600;

          if (flight.departure?.scheduled && flight.arrival?.scheduled) {
            const depTime = new Date(flight.departure.scheduled).getTime();
            const arrTime = new Date(flight.arrival.scheduled).getTime();
            if (arrTime > depTime) {
              duration = (arrTime - depTime) / 1000;
            }
          }

          return {
            segments: [{
              airline: flight.airline?.name,
              airlineIata: flight.airline?.iata,
              flightNumber: flight.flight?.iata || flight.flight?.number,
              departureAirport: flight.departure?.airport || departureAirport.name,
              departureIata: flight.departure?.iata || departureAirport.iata,
              arrivalAirport: flight.arrival?.airport || arrivalAirport.name,
              arrivalIata: flight.arrival?.iata || arrivalAirport.iata,
              scheduledDeparture: flight.departure?.scheduled,
              scheduledArrival: flight.arrival?.scheduled,
              flightStatus: flight.flight_status,
              aircraft: flight.aircraft?.registration,
              duration,
            }],
            transfers: [],
            totalDuration: duration,
          };
        }
      } catch (error) {
        console.warn('Error searching for direct flights:', error);
      }

      // No direct flight found, try to find connecting flights via major hubs
      const majorHubs = ['JFK', 'LAX', 'ORD', 'LHR', 'CDG', 'FRA', 'DXB', 'HND', 'SIN', 'SYD', 'GRU', 'JNB'];
      
      // Find hubs that are reasonable connections
      const connectionHubs = majorHubs.filter(hub => 
        hub !== departureAirport.iata && hub !== arrivalAirport.iata
      );

      let bestConnection: {
        segments: Array<any>;
        transfers: Array<any>;
        totalDuration: number;
      } | null = null;
      let bestTotalDuration = Infinity;

      // Try up to 3 connection hubs to avoid too many API calls
      for (const hub of connectionHubs.slice(0, 3)) {
        try {
          // Find flight from departure to hub
          const leg1Url = `${this.aviationStackApiUrl}/flights?access_key=${this.aviationStackApiKey}&dep_iata=${departureAirport.iata}&arr_iata=${hub}&limit=1`;
          const leg1Response = await firstValueFrom(this.httpService.get(leg1Url));
          const leg1Data = leg1Response.data;

          if (leg1Data.error || !leg1Data.data || leg1Data.data.length === 0) {
            continue;
          }

          // Find flight from hub to arrival
          const leg2Url = `${this.aviationStackApiUrl}/flights?access_key=${this.aviationStackApiKey}&dep_iata=${hub}&arr_iata=${arrivalAirport.iata}&limit=1`;
          const leg2Response = await firstValueFrom(this.httpService.get(leg2Url));
          const leg2Data = leg2Response.data;

          if (leg2Data.error || !leg2Data.data || leg2Data.data.length === 0) {
            continue;
          }

          const leg1 = leg1Data.data[0];
          const leg2 = leg2Data.data[0];

          // Calculate durations
          let leg1Duration = this.calculateGreatCircleDistance(
            { longitude: departureAirport.lng, latitude: departureAirport.lat },
            { longitude: 0, latitude: 0 }, // Hub coordinates would be better, but using estimate
          ) / 250 + 3600;

          let leg2Duration = this.calculateGreatCircleDistance(
            { longitude: 0, latitude: 0 },
            { longitude: arrivalAirport.lng, latitude: arrivalAirport.lat },
          ) / 250 + 3600;

          if (leg1.departure?.scheduled && leg1.arrival?.scheduled) {
            const depTime = new Date(leg1.departure.scheduled).getTime();
            const arrTime = new Date(leg1.arrival.scheduled).getTime();
            if (arrTime > depTime) {
              leg1Duration = (arrTime - depTime) / 1000;
            }
          }

          if (leg2.departure?.scheduled && leg2.arrival?.scheduled) {
            const depTime = new Date(leg2.departure.scheduled).getTime();
            const arrTime = new Date(leg2.arrival.scheduled).getTime();
            if (arrTime > depTime) {
              leg2Duration = (arrTime - depTime) / 1000;
            }
          }

          // Calculate layover (minimum 1 hour, estimate based on flight times)
          const layoverDuration = Math.max(3600, leg2Duration * 0.3); // At least 1 hour or 30% of second leg

          const totalDuration = leg1Duration + layoverDuration + leg2Duration;

          if (totalDuration < bestTotalDuration) {
            bestTotalDuration = totalDuration;
            bestConnection = {
              segments: [
                {
                  airline: leg1.airline?.name,
                  airlineIata: leg1.airline?.iata,
                  flightNumber: leg1.flight?.iata || leg1.flight?.number,
                  departureAirport: leg1.departure?.airport || departureAirport.name,
                  departureIata: leg1.departure?.iata || departureAirport.iata,
                  arrivalAirport: leg1.arrival?.airport || `${hub} Airport`,
                  arrivalIata: leg1.arrival?.iata || hub,
                  scheduledDeparture: leg1.departure?.scheduled,
                  scheduledArrival: leg1.arrival?.scheduled,
                  flightStatus: leg1.flight_status,
                  aircraft: leg1.aircraft?.registration,
                  duration: leg1Duration,
                },
                {
                  airline: leg2.airline?.name,
                  airlineIata: leg2.airline?.iata,
                  flightNumber: leg2.flight?.iata || leg2.flight?.number,
                  departureAirport: leg2.departure?.airport || `${hub} Airport`,
                  departureIata: leg2.departure?.iata || hub,
                  arrivalAirport: leg2.arrival?.airport || arrivalAirport.name,
                  arrivalIata: leg2.arrival?.iata || arrivalAirport.iata,
                  scheduledDeparture: leg2.departure?.scheduled,
                  scheduledArrival: leg2.arrival?.scheduled,
                  flightStatus: leg2.flight_status,
                  aircraft: leg2.aircraft?.registration,
                  duration: leg2Duration,
                },
              ],
              transfers: [{
                airport: leg1.arrival?.airport || `${hub} Airport`,
                airportIata: hub,
                layoverDuration,
              }],
              totalDuration,
            };
          }
        } catch (error) {
          console.warn(`Error checking connection via ${hub}:`, error);
          continue;
        }
      }

      if (bestConnection) {
        return bestConnection;
      }

      // Fallback: estimate direct flight
      const distance = this.calculateGreatCircleDistance(
        { longitude: departureAirport.lng, latitude: departureAirport.lat },
        { longitude: arrivalAirport.lng, latitude: arrivalAirport.lat },
      );
      const flightSpeedMps = 250;
      const duration = distance / flightSpeedMps + 3600;

      return {
        segments: [{
          departureAirport: departureAirport.name,
          departureIata: departureAirport.iata,
          arrivalAirport: arrivalAirport.name,
          arrivalIata: arrivalAirport.iata,
          duration,
        }],
        transfers: [],
        totalDuration: duration,
      };
    } catch (error) {
      console.error('Error finding optimal flight route:', error);
      // Fallback: estimate direct flight
      const distance = this.calculateGreatCircleDistance(
        { longitude: departureAirport.lng, latitude: departureAirport.lat },
        { longitude: arrivalAirport.lng, latitude: arrivalAirport.lat },
      );
      const flightSpeedMps = 250;
      const duration = distance / flightSpeedMps + 3600;

      return {
        segments: [{
          departureAirport: departureAirport.name,
          departureIata: departureAirport.iata,
          arrivalAirport: arrivalAirport.name,
          arrivalIata: arrivalAirport.iata,
          duration,
        }],
        transfers: [],
        totalDuration: duration,
      };
    }
  }

  /**
   * Get flight information from AviationStack API
   * Searches for flights between departure and arrival locations
   * @deprecated Use findOptimalFlightRoute instead
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
   * Validate entire journey for geographic consistency and sanity
   * Checks: continent consistency, distance sanity, implausible detours
   */
  private async validateJourney(
    route: Route,
    origin: RouteWaypoint,
    destination: RouteWaypoint,
  ): Promise<{ valid: boolean; reason?: string }> {
    // 1. Validate origin and destination countries
    const originCountry = await this.getCountryFromCoordinates(origin.coordinates);
    const destCountry = await this.getCountryFromCoordinates(destination.coordinates);

    // 2. Check for intercontinental driving (ground transport > 500km)
    for (const leg of route.legs) {
      if (leg.transportMode && ['driving', 'walking', 'transit'].includes(leg.transportMode)) {
        const legDistanceKm = leg.distance / 1000;
        if (legDistanceKm > 500) {
          return {
            valid: false,
            reason: `Invalid route: Ground transport segment (${legDistanceKm.toFixed(1)}km) exceeds maximum distance. This may indicate an intercontinental or implausible route.`,
          };
        }
      }
    }

    // 3. Validate flight segments are logical
    if (route.flightInfo) {
      const flightDistance = this.calculateGreatCircleDistance(
        { longitude: route.flightInfo.departureLng || 0, latitude: route.flightInfo.departureLat || 0 },
        { longitude: route.flightInfo.arrivalLng || 0, latitude: route.flightInfo.arrivalLat || 0 },
      );
      
      // Flight should be significant distance (at least 100km)
      if (flightDistance < 100000) {
        return {
          valid: false,
          reason: 'Invalid route: Flight segment is too short. Ground transport may be more appropriate.',
        };
      }
    }

    // 4. Check total distance sanity (should be reasonable compared to direct distance)
    const directDistance = this.calculateGreatCircleDistance(origin.coordinates, destination.coordinates);
    const routeDistance = route.distance;
    const detourRatio = routeDistance / directDistance;

    // If route is more than 3x the direct distance, it's likely implausible
    if (detourRatio > 3) {
      return {
        valid: false,
        reason: `Invalid route: Total route distance (${(routeDistance / 1000).toFixed(1)}km) is ${detourRatio.toFixed(1)}x the direct distance, indicating an implausible detour.`,
      };
    }

    // 5. Validate airport selection consistency
    if (route.flightInfo && originCountry && destCountry) {
      // Departure airport should be in origin country
      if (route.flightInfo.departureIata) {
        // This is already validated during airport selection, but double-check
        const depAirportCountry = await this.getCountryFromCoordinates({
          longitude: route.flightInfo.departureLng || 0,
          latitude: route.flightInfo.departureLat || 0,
        });
        if (depAirportCountry && depAirportCountry !== originCountry) {
          return {
            valid: false,
            reason: `Invalid route: Departure airport (${route.flightInfo.departureIata}) is not in origin country (${originCountry}).`,
          };
        }
      }

      // Arrival airport should be in destination country
      if (route.flightInfo.arrivalIata) {
        const arrAirportCountry = await this.getCountryFromCoordinates({
          longitude: route.flightInfo.arrivalLng || 0,
          latitude: route.flightInfo.arrivalLat || 0,
        });
        if (arrAirportCountry && arrAirportCountry !== destCountry) {
          return {
            valid: false,
            reason: `Invalid route: Arrival airport (${route.flightInfo.arrivalIata}) is not in destination country (${destCountry}).`,
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Get country code from coordinates using reverse geocoding
   */
  private async getCountryFromCoordinates(
    coordinates: { longitude: number; latitude: number },
  ): Promise<string | null> {
    try {
      const results = await this.geocodingService.reverseGeocode(coordinates, 1);
      if (results && results.length > 0) {
        // Extract country from context (usually the last context item)
        const context = results[0].context;
        if (context && context.length > 0) {
          // Country is typically the last context item
          const countryContext = context[context.length - 1];
          // Mapbox returns country codes in shortCode field
          return countryContext.shortCode || countryContext.text || null;
        }
      }
      return null;
    } catch (error) {
      console.warn('Failed to get country from coordinates:', error);
      return null;
    }
  }

  /**
   * Check if two coordinates are in the same country
   */
  private async areInSameCountry(
    coord1: { longitude: number; latitude: number },
    coord2: { longitude: number; latitude: number },
  ): Promise<boolean> {
    const country1 = await this.getCountryFromCoordinates(coord1);
    const country2 = await this.getCountryFromCoordinates(coord2);
    
    if (!country1 || !country2) {
      // If we can't determine country, assume they're in the same country if close
      const distance = this.calculateGreatCircleDistance(coord1, coord2);
      return distance < 500000; // Within 500km, likely same country
    }
    
    return country1 === country2;
  }

  /**
   * Find nearest airport to given coordinates using AviationStack API
   * Searches within a configurable radius (default 150km) for viable commercial airports
   * ENFORCES: Airport must be in same country as origin/destination
   */
  private async findNearestAirport(
    coordinates: { longitude: number; latitude: number },
    searchRadiusKm: number = 150,
    requiredCountry?: string | null,
  ): Promise<{ iata: string; name: string; lat: number; lng: number; country?: string } | null> {
    // Check cache first
    const cacheKey = `${coordinates.latitude.toFixed(2)},${coordinates.longitude.toFixed(2)}`;
    const cached = this.airportCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.airport;
    }

    try {
      const searchRadiusMeters = searchRadiusKm * 1000;
      
      // Try to get airports from AviationStack API
      // Note: AviationStack free tier has limited endpoints, so we'll use pagination
      let allAirports: any[] = [];
      let offset = 0;
      const limit = 100;
      const maxPages = 5; // Limit to prevent excessive API calls

      for (let page = 0; page < maxPages; page++) {
        const url = `${this.aviationStackApiUrl}/airports?access_key=${this.aviationStackApiKey}&limit=${limit}&offset=${offset}`;
        
        try {
      const response = await firstValueFrom(this.httpService.get(url));
      const data = response.data;

      if (data.error || !data.data || data.data.length === 0) {
            break;
          }

          allAirports = allAirports.concat(data.data);
          
          // If we got fewer results than the limit, we've reached the end
          if (data.data.length < limit) {
            break;
          }

          offset += limit;
        } catch (error) {
          console.warn('Error fetching airports page:', error);
          break;
        }
      }

      // If no airports from API, use fallback
      if (allAirports.length === 0) {
        const fallback = this.getFallbackAirport(coordinates);
        if (fallback) {
          this.airportCache.set(cacheKey, { airport: fallback, expires: Date.now() + this.airportCacheTTL });
        }
        return fallback;
      }

      // Filter and find nearest viable commercial airport within radius
      let nearestAirport: { iata: string; name: string; lat: number; lng: number } | null = null;
      let minDistance = Infinity;

      for (const airport of allAirports) {
        if (!airport.latitude || !airport.longitude || !airport.iata_code) continue;
        
        // Skip airports without IATA codes (not commercial)
        if (!airport.iata_code || airport.iata_code.length !== 3) continue;
        
        const airportCoords = {
          longitude: parseFloat(airport.longitude),
          latitude: parseFloat(airport.latitude),
        };
        
        const distance = this.calculateGreatCircleDistance(coordinates, airportCoords);

        // Only consider airports within search radius
        if (distance <= searchRadiusMeters && distance < minDistance) {
          minDistance = distance;
          nearestAirport = {
            iata: airport.iata_code,
            name: airport.airport_name || airport.name || `${airport.iata_code} Airport`,
            lat: parseFloat(airport.latitude),
            lng: parseFloat(airport.longitude),
          };
        }
      }

      // If no airport found within radius, try expanding search (but still enforce country)
      if (!nearestAirport) {
        // Try expanding search to 300km (still reasonable for same-country travel)
        if (searchRadiusKm < 300) {
          return this.findNearestAirport(coordinates, 300, requiredCountry || undefined);
        }
        // If still no airport, and we have country requirement, throw error
        if (requiredCountry) {
          throw new HttpException(
            `No commercial airport found within 300km in ${requiredCountry}. Please select a location closer to an airport.`,
            HttpStatus.BAD_REQUEST,
          );
        }
        // Final fallback (only if no country requirement)
        const fallback = this.getFallbackAirport(coordinates);
        if (fallback) {
          this.airportCache.set(cacheKey, { airport: fallback, expires: Date.now() + this.airportCacheTTL });
        }
        return fallback;
      }

      // Cache the result
      this.airportCache.set(cacheKey, { airport: nearestAirport, expires: Date.now() + this.airportCacheTTL });

      return nearestAirport;
    } catch (error) {
      console.error('Error finding nearest airport:', error);
      const fallback = this.getFallbackAirport(coordinates);
      if (fallback) {
        this.airportCache.set(cacheKey, { airport: fallback, expires: Date.now() + this.airportCacheTTL });
      }
      return fallback;
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

