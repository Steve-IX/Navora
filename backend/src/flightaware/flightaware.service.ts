import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import {
  FlightDetailsResponse,
  LiveFlightsQuery,
  LiveFlightsResponse,
  NormalizedFlightDetails,
  NormalizedFlightSummary,
  NormalizedPosition,
  OpenSkyResponse,
  OpenSkyStateVector,
} from './types';

// Cache TTLs in milliseconds
const LIVE_CACHE_TTL_MS = 15 * 1000; // 15 seconds - OpenSky updates every 5-10 seconds
const DETAILS_CACHE_TTL_MS = 60 * 1000; // 1 minute for flight details
const RATE_LIMIT_CACHE_TTL_MS = 60 * 1000; // Cache rate limit errors for 60s

// Unit conversion constants
const METERS_TO_FEET = 3.28084;
const MS_TO_KNOTS = 1.94384;

// OpenSky state vector array indices
const ICAO24 = 0;
const CALLSIGN = 1;
const ORIGIN_COUNTRY = 2;
const TIME_POSITION = 3;
const LAST_CONTACT = 4;
const LONGITUDE = 5;
const LATITUDE = 6;
const BARO_ALTITUDE = 7;
const ON_GROUND = 8;
const VELOCITY = 9;
const TRUE_TRACK = 10;
const VERTICAL_RATE = 11;
const GEO_ALTITUDE = 13;
const SQUAWK = 14;

@Injectable()
export class FlightawareService {
  private readonly logger = new Logger(FlightawareService.name);
  private readonly openSkyUsername: string;
  private readonly openSkyPassword: string;
  private readonly openSkyBaseUrl = 'https://opensky-network.org/api';
  private readonly hasCredentials: boolean;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    // OpenSky uses basic auth (username/password), not OAuth2
    this.openSkyUsername = this.configService.get<string>('OPENSKY_USERNAME') || '';
    this.openSkyPassword = this.configService.get<string>('OPENSKY_PASSWORD') || '';
    this.hasCredentials = !!(this.openSkyUsername && this.openSkyPassword);

    if (!this.hasCredentials) {
      this.logger.log('OpenSky credentials not configured - using unauthenticated API (rate limited)');
    } else {
      this.logger.log('OpenSky API configured with authentication');
    }
  }

  async getLiveFlights(query: LiveFlightsQuery): Promise<LiveFlightsResponse> {

    const cacheKey = this.buildLiveCacheKey(query);
    const cached = await this.cacheManager.get<LiveFlightsResponse>(cacheKey);

    if (cached) {
      return { ...cached, source: 'cache', stale: false };
    }

    // Check if we're in a rate-limit cooldown period
    const rateLimitKey = 'flights:rate_limited';
    const isRateLimited = await this.cacheManager.get<boolean>(rateLimitKey);
    if (isRateLimited) {
      throw new HttpException('API rate limit - please wait', HttpStatus.TOO_MANY_REQUESTS);
    }

    try {
      const response = await this.fetchLiveFlightsFromOpenSky(query);
      await this.cacheManager.set(cacheKey, response, LIVE_CACHE_TTL_MS);
      return response;
    } catch (error: any) {
      if (error?.status === 429 || error?.response?.status === 429) {
        await this.cacheManager.set(rateLimitKey, true, RATE_LIMIT_CACHE_TTL_MS);
      }
      this.logger.warn(`Live flights fetch failed: ${this.errorMessage(error)}`);
      if (cached) {
        return { ...cached, source: 'cache', stale: true };
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Live flight data unavailable', HttpStatus.BAD_GATEWAY);
    }
  }

  async getFlightDetails(flightId: string): Promise<FlightDetailsResponse> {

    const cacheKey = `flights:details:${flightId}`;
    const cached = await this.cacheManager.get<FlightDetailsResponse>(cacheKey);

    if (cached) {
      return { ...cached, source: 'cache', stale: false };
    }

    // Check if we're in a rate-limit cooldown period
    const rateLimitKey = 'flights:rate_limited';
    const isRateLimited = await this.cacheManager.get<boolean>(rateLimitKey);
    if (isRateLimited) {
      throw new HttpException('API rate limit - please wait', HttpStatus.TOO_MANY_REQUESTS);
    }

    try {
      const response = await this.fetchFlightDetailsFromOpenSky(flightId);
      await this.cacheManager.set(cacheKey, response, DETAILS_CACHE_TTL_MS);
      return response;
    } catch (error: any) {
      if (error?.status === 429 || error?.response?.status === 429) {
        await this.cacheManager.set(rateLimitKey, true, RATE_LIMIT_CACHE_TTL_MS);
      }
      this.logger.warn(`Flight details fetch failed: ${this.errorMessage(error)}`);
      if (cached) {
        return { ...cached, source: 'cache', stale: true };
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Flight details unavailable', HttpStatus.BAD_GATEWAY);
    }
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.hasCredentials) {
      return {};
    }

    // OpenSky uses HTTP Basic Authentication
    const credentials = Buffer.from(`${this.openSkyUsername}:${this.openSkyPassword}`).toString('base64');
    return {
      Authorization: `Basic ${credentials}`,
    };
  }

  private async fetchLiveFlightsFromOpenSky(query: LiveFlightsQuery): Promise<LiveFlightsResponse> {
    const { bbox, region, max } = query;
    const bounds = this.resolveBounds(region, bbox);

    // Build query parameters for OpenSky
    const params: Record<string, any> = {};

    // Add bounding box parameters if not global
    if (bounds.minLat > -90 || bounds.maxLat < 90 || bounds.minLon > -180 || bounds.maxLon < 180) {
      params.lamin = bounds.minLat;
      params.lamax = bounds.maxLat;
      params.lomin = bounds.minLon;
      params.lomax = bounds.maxLon;
    }

    this.logger.debug(
      `OpenSky query params: lamin=${params.lamin}, lamax=${params.lamax}, lomin=${params.lomin}, lomax=${params.lomax}`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.get<OpenSkyResponse>(`${this.openSkyBaseUrl}/states/all`, {
          params,
          headers: this.getAuthHeaders(),
        }),
      );

      const states = response.data.states || [];
      this.logger.log(`OpenSky returned ${states.length} aircraft state vectors`);

      if (states.length === 0) {
        // If no flights in bounds, try fetching without bounds (global)
        if (Object.keys(params).length > 0) {
          this.logger.warn('No flights in bounds, fetching global flights...');
          const globalResponse = await firstValueFrom(
            this.httpService.get<OpenSkyResponse>(`${this.openSkyBaseUrl}/states/all`, {
              headers: this.getAuthHeaders(),
            }),
          );
          const globalStates = globalResponse.data.states || [];
          this.logger.log(`OpenSky global query returned ${globalStates.length} aircraft`);

          const normalizedFlights = globalStates
            .map((state) => this.normalizeStateVector(state))
            .filter((flight): flight is NormalizedFlightSummary => flight !== null)
            .filter((flight) => this.applyPostFilters(flight, query))
            .slice(0, max ?? 200);

          return {
            region: region ?? 'global',
            updatedAt: new Date().toISOString(),
            flights: normalizedFlights,
            stale: false,
            source: 'opensky',
          };
        }

        return {
          region: region ?? 'global',
          updatedAt: new Date().toISOString(),
          flights: [],
          stale: false,
          source: 'opensky',
        };
      }

      // Normalize and filter flights
      const normalizedFlights = states
        .map((state) => this.normalizeStateVector(state))
        .filter((flight): flight is NormalizedFlightSummary => flight !== null)
        .filter((flight) => this.applyPostFilters(flight, query))
        .slice(0, max ?? 200);

      this.logger.log(`Returning ${normalizedFlights.length} flights after filtering`);

      return {
        region: region ?? 'global',
        updatedAt: new Date().toISOString(),
        flights: normalizedFlights,
        stale: false,
        source: 'opensky',
      };
    } catch (error: any) {
      // Handle rate limiting and auth errors gracefully
      if (error?.response?.status === 429) {
        this.logger.warn('OpenSky API rate limit exceeded');
        throw error;
      }
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        this.logger.warn('OpenSky API authentication failed - check credentials');
        throw error;
      }
      throw error;
    }
  }

  private async fetchFlightDetailsFromOpenSky(flightId: string): Promise<FlightDetailsResponse> {
    // OpenSky uses ICAO24 addresses, so flightId should be the icao24 or callsign

    try {
      // Try to find the aircraft by icao24 address
      const params: Record<string, string> = {};

      // If it looks like a callsign (has letters and numbers), search differently
      // OpenSky doesn't support callsign filtering directly, so we fetch all and filter
      if (/^[A-Fa-f0-9]{6}$/.test(flightId)) {
        // Looks like an ICAO24 address
        params.icao24 = flightId.toLowerCase();
      }

      const response = await firstValueFrom(
        this.httpService.get<OpenSkyResponse>(`${this.openSkyBaseUrl}/states/all`, {
          params: Object.keys(params).length > 0 ? params : undefined,
          headers: this.getAuthHeaders(),
        }),
      );

      const states = response.data.states || [];

      // Find the matching flight
      let matchingState = states.find((state) => {
        const icao24 = state[ICAO24];
        const callsign = (state[CALLSIGN] || '').trim();
        return (
          icao24.toLowerCase() === flightId.toLowerCase() ||
          callsign.toLowerCase() === flightId.toLowerCase()
        );
      });

      if (!matchingState && states.length > 0) {
        // If we filtered by icao24 and got a result, use it
        matchingState = states[0];
      }

      if (!matchingState) {
        return {
          flight: null,
          updatedAt: new Date().toISOString(),
          stale: false,
          source: 'opensky',
        };
      }

      const normalizedFlight = this.normalizeStateVector(matchingState);
      if (!normalizedFlight) {
        return {
          flight: null,
          updatedAt: new Date().toISOString(),
          stale: false,
          source: 'opensky',
        };
      }

      // Convert to details format
      const details: NormalizedFlightDetails = {
        ...normalizedFlight,
        aircraft: {
          registration: undefined,
          type: undefined,
        },
      };

      return {
        flight: details,
        updatedAt: new Date().toISOString(),
        stale: false,
        source: 'opensky',
      };
    } catch (error: any) {
      // Handle rate limiting and auth errors gracefully
      if (error?.response?.status === 429) {
        this.logger.warn('OpenSky API rate limit exceeded');
        throw error;
      }
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        this.logger.warn('OpenSky API authentication failed - check credentials');
        throw error;
      }
      throw error;
    }
  }

  private normalizeStateVector(state: OpenSkyStateVector): NormalizedFlightSummary | null {
    const icao24 = state[ICAO24];
    const callsign = state[CALLSIGN] ? String(state[CALLSIGN]).trim() : null;
    const originCountry = state[ORIGIN_COUNTRY];
    const longitude = state[LONGITUDE];
    const latitude = state[LATITUDE];
    const baroAltitude = state[BARO_ALTITUDE];
    const onGround = state[ON_GROUND];
    const velocity = state[VELOCITY];
    const trueTrack = state[TRUE_TRACK];
    const geoAltitude = state[GEO_ALTITUDE];
    const timePosition = state[TIME_POSITION];
    const lastContact = state[LAST_CONTACT];

    // Must have valid position
    if (latitude === null || longitude === null) {
      return null;
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return null;
    }

    // Use geo_altitude if available, otherwise baro_altitude
    const altitudeMeters = geoAltitude ?? baroAltitude;
    const altitudeFeet = altitudeMeters !== null ? Math.round(altitudeMeters * METERS_TO_FEET) : undefined;

    // Convert velocity from m/s to knots
    const speedKnots = velocity !== null ? Math.round(velocity * MS_TO_KNOTS) : undefined;

    // Determine heading (true track in degrees)
    const heading = trueTrack !== null ? Math.round(trueTrack) : undefined;

    // Build position object
    const position: NormalizedPosition = {
      latitude,
      longitude,
      altitude: altitudeFeet,
      groundSpeed: speedKnots,
      heading,
      isOnGround: onGround ?? false,
      timestamp: timePosition
        ? new Date(timePosition * 1000).toISOString()
        : new Date(lastContact * 1000).toISOString(),
    };

    return {
      id: icao24,
      callsign: callsign || icao24.toUpperCase(),
      flightNumber: callsign || undefined,
      operator: {
        name: originCountry,
        icao: undefined,
        iata: undefined,
        callsign: undefined,
      },
      origin: undefined, // OpenSky doesn't provide origin/destination
      destination: undefined,
      position,
      status: onGround ? 'ground' : 'airborne',
      lastUpdatedUtc: position.timestamp,
    };
  }

  private resolveBounds(region?: string, bbox?: string) {
    if (bbox) {
      const [minLat, minLon, maxLat, maxLon] = bbox.split(',').map(Number);
      if ([minLat, minLon, maxLat, maxLon].every((value) => !Number.isNaN(value))) {
        return { minLat, minLon, maxLat, maxLon };
      }
    }

    const regionBounds: Record<
      string,
      { minLat: number; minLon: number; maxLat: number; maxLon: number }
    > = {
      UK_EU: { minLat: 34, minLon: -11, maxLat: 72, maxLon: 35 },
      AU: { minLat: -45, minLon: 110, maxLat: -10, maxLon: 155 },
      GLOBAL: { minLat: -90, minLon: -180, maxLat: 90, maxLon: 180 },
    };

    const key = (region ?? 'GLOBAL').toUpperCase();
    return regionBounds[key] ?? regionBounds.GLOBAL;
  }

  private applyPostFilters(flight: NormalizedFlightSummary, query: LiveFlightsQuery): boolean {
    if (!flight.position) {
      return false;
    }

    // Altitude filters (already converted to feet)
    if (query.minAltitude !== undefined && flight.position.altitude !== undefined) {
      if (flight.position.altitude < query.minAltitude) {
        return false;
      }
    }
    if (query.maxAltitude !== undefined && flight.position.altitude !== undefined) {
      if (flight.position.altitude > query.maxAltitude) {
        return false;
      }
    }

    // Speed filters (already converted to knots)
    if (query.minSpeed !== undefined && flight.position.groundSpeed !== undefined) {
      if (flight.position.groundSpeed < query.minSpeed) {
        return false;
      }
    }
    if (query.maxSpeed !== undefined && flight.position.groundSpeed !== undefined) {
      if (flight.position.groundSpeed > query.maxSpeed) {
        return false;
      }
    }

    // Callsign/airline filter
    if (query.airline) {
      const airlineFilter = query.airline.toLowerCase();
      const callsignMatch = flight.callsign?.toLowerCase().includes(airlineFilter);
      const operatorMatch = flight.operator?.name?.toLowerCase().includes(airlineFilter);
      if (!callsignMatch && !operatorMatch) {
        return false;
      }
    }

    return true;
  }

  private buildLiveCacheKey(query: LiveFlightsQuery): string {
    return `flights:live:${JSON.stringify({
      region: query.region ?? 'global',
      bbox: query.bbox ?? null,
      airline: query.airline ?? null,
      minAltitude: query.minAltitude ?? null,
      maxAltitude: query.maxAltitude ?? null,
      minSpeed: query.minSpeed ?? null,
      maxSpeed: query.maxSpeed ?? null,
      max: query.max ?? null,
    })}`;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
