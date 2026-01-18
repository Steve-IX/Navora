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
  NormalizedAirport,
  NormalizedFlightDetails,
  NormalizedFlightSummary,
  NormalizedOperator,
  NormalizedPosition,
} from './types';

// Cache TTLs in milliseconds (cache-manager v5+ uses ms)
const LIVE_CACHE_TTL_MS = 60 * 1000; // 60 seconds - respect API rate limits
const DETAILS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes for flight details
const RATE_LIMIT_CACHE_TTL_MS = 60 * 1000; // Cache rate limit errors for 60s (AviationStack has stricter limits)

type AviationStackResponse = Record<string, any>;

@Injectable()
export class FlightawareService {
  private readonly logger = new Logger(FlightawareService.name);
  private readonly aviationStackApiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.aviationStackApiKey = 
      this.configService.get<string>('AVIATIONSTACK_KEY') ||
      this.configService.get<string>('AVIATIONSTACK_API_KEY') ||
      '';
    
    if (!this.aviationStackApiKey) {
      this.logger.warn('AVIATIONSTACK_KEY not configured - flight tracking disabled');
    }
  }

  async getLiveFlights(query: LiveFlightsQuery): Promise<LiveFlightsResponse> {
    if (!this.aviationStackApiKey) {
      throw new HttpException('Flight tracking API not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

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
      const response = await this.fetchLiveFlightsFromAviationStack(query);
      await this.cacheManager.set(cacheKey, response, LIVE_CACHE_TTL_MS);
      return response;
    } catch (error: any) {
      // If rate limited, set cooldown to prevent hammering the API
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
    if (!this.aviationStackApiKey) {
      throw new HttpException('Flight tracking API not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

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
      const response = await this.fetchFlightDetailsFromAviationStack(flightId);
      await this.cacheManager.set(cacheKey, response, DETAILS_CACHE_TTL_MS);
      return response;
    } catch (error: any) {
      // If rate limited, set cooldown to prevent hammering the API
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

  private async fetchLiveFlightsFromAviationStack(
    query: LiveFlightsQuery,
  ): Promise<LiveFlightsResponse> {
    const { bbox, region, max } = query;
    const bounds = this.resolveBounds(region, bbox);

    // Build AviationStack query params
    // Note: AviationStack free tier may have limited live position data
    const params: Record<string, any> = {
      access_key: this.aviationStackApiKey,
      flight_status: 'active', // Only get active (in-flight) aircraft with live data
      limit: 100, // Max allowed by most plans
    };
    
    // Log query params (without API key)
    this.logger.debug(`AviationStack query params: ${JSON.stringify({ ...params, access_key: '[REDACTED]' })}`);

    // Add optional filters
    if (query.airline) {
      // Try to use airline filter if it looks like an IATA/ICAO code
      if (query.airline.length === 2) {
        params.airline_iata = query.airline.toUpperCase();
      } else if (query.airline.length === 3) {
        params.airline_icao = query.airline.toUpperCase();
      }
    }

    this.logger.log(`AviationStack query: flight_status=active, limit=100`);

    const response = await this.aviationStackGet<AviationStackResponse>('/flights', params);

    const entries = response?.data ?? [];
    this.logger.log(`AviationStack returned ${entries.length} flight entries`);
    
    if (entries.length === 0) {
      this.logger.warn('AviationStack returned no flight entries - API may be rate-limited or no active flights found');
      return {
        region: region ?? 'global',
        updatedAt: new Date().toISOString(),
        flights: [],
        stale: false,
        source: 'aviationstack',
      };
    }
    
    // Log sample entry structure for debugging (first entry only, limited fields)
    if (entries.length > 0) {
      const sample = entries[0];
      this.logger.debug(`Sample entry: has live=${!!sample.live}, has airline=${!!sample.airline}, flight_status=${sample.flight_status}`);
      if (sample.live) {
        this.logger.debug(`Sample live data: lat=${sample.live.latitude}, lon=${sample.live.longitude}`);
      }
    }
    
    let flightsWithPosition = 0;
    let flightsFilteredByPostFilters = 0;
    let flightsFilteredByBounds = 0;
    
    const normalizedFlights = entries.map((entry: any) => this.normalizeLiveFlight(entry));
    const flightsWithPos = normalizedFlights.filter((flight: NormalizedFlightSummary) => {
      if (!flight.position) {
        return false;
      }
      flightsWithPosition++;
      return true;
    });
    
    // Log sample positions for debugging
    if (flightsWithPos.length > 0) {
      const sampleFlights = flightsWithPos.slice(0, 3);
      this.logger.debug(`Sample flights with position: ${sampleFlights.map(f => 
        `${f.callsign || f.id}: (${f.position?.latitude?.toFixed(2)}, ${f.position?.longitude?.toFixed(2)})`
      ).join(', ')}`);
    }
    
    this.logger.debug(`Using bounds: lat [${bounds.minLat.toFixed(2)}, ${bounds.maxLat.toFixed(2)}], lon [${bounds.minLon.toFixed(2)}, ${bounds.maxLon.toFixed(2)}]`);
    
    // First, try to get flights within bounds
    let flights = flightsWithPos
      .filter((flight: NormalizedFlightSummary) => {
        const passed = this.applyPostFilters(flight, query);
        if (!passed) flightsFilteredByPostFilters++;
        return passed;
      })
      .filter((flight: NormalizedFlightSummary) => {
        const passed = this.filterByBounds(flight, bounds);
        if (!passed && flight.position) {
          flightsFilteredByBounds++;
          // Log first few filtered positions for debugging
          if (flightsFilteredByBounds <= 3) {
            this.logger.debug(`Flight ${flight.callsign || flight.id} filtered by bounds: (${flight.position.latitude.toFixed(2)}, ${flight.position.longitude.toFixed(2)}) outside bounds`);
          }
        }
        return passed;
      })
      .slice(0, max ?? 200);
    
    // If no flights found within bounds but we have flights with position data,
    // fall back to returning flights from anywhere (so users can see the feature works)
    if (flights.length === 0 && flightsWithPos.length > 0) {
      this.logger.warn(`No flights found within bounds. Falling back to global flights with position data. ` +
        `Bounds: lat [${bounds.minLat.toFixed(2)}, ${bounds.maxLat.toFixed(2)}], lon [${bounds.minLon.toFixed(2)}, ${bounds.maxLon.toFixed(2)}]`);
      
      // Return flights with position data from anywhere (limit to smaller number for fallback)
      flights = flightsWithPos
        .filter((flight: NormalizedFlightSummary) => this.applyPostFilters(flight, query))
        .slice(0, Math.min(20, max ?? 20)); // Limit fallback to 20 flights to avoid overwhelming the map
      
      this.logger.log(`Returning ${flights.length} global flights with position data as fallback`);
    }
    
    this.logger.log(`Filtered: ${flightsWithPosition}/${entries.length} flights have position data, ` +
      `${flightsFilteredByPostFilters} filtered by post-filters, ${flightsFilteredByBounds} filtered by bounds, ` +
      `${flights.length} remaining`);
    
    if (flightsWithPosition === 0 && entries.length > 0) {
      this.logger.warn('AviationStack returned flights but none have live position data - check API plan includes live tracking');
    }

    return {
      region: region ?? 'global',
      updatedAt: new Date().toISOString(),
      flights,
      stale: false,
      source: 'aviationstack',
    };
  }

  private filterByBounds(
    flight: NormalizedFlightSummary,
    bounds: { minLat: number; minLon: number; maxLat: number; maxLon: number },
  ): boolean {
    if (!flight.position) return false;
    const { latitude, longitude } = flight.position;
    
    // Add a small buffer (0.1 degrees ≈ 11km) to account for map viewport edge cases
    const buffer = 0.1;
    
    return (
      latitude >= (bounds.minLat - buffer) &&
      latitude <= (bounds.maxLat + buffer) &&
      longitude >= (bounds.minLon - buffer) &&
      longitude <= (bounds.maxLon + buffer)
    );
  }

  private async fetchFlightDetailsFromAviationStack(
    flightId: string,
  ): Promise<FlightDetailsResponse> {
    // flightId could be flight_iata (e.g., "AA123") or flight_icao (e.g., "AAL123")
    const params: Record<string, any> = {
      access_key: this.aviationStackApiKey,
      limit: 1,
    };

    // Determine if it's IATA or ICAO format
    if (flightId.length <= 6 && /^[A-Z]{2}\d+$/i.test(flightId)) {
      params.flight_iata = flightId.toUpperCase();
    } else {
      params.flight_icao = flightId.toUpperCase();
    }

    const response = await this.aviationStackGet<AviationStackResponse>('/flights', params);
    const entry = response?.data?.[0];
    const normalized = entry ? this.normalizeFlightDetails(entry) : null;

    return {
      flight: normalized,
      updatedAt: new Date().toISOString(),
      stale: false,
      source: 'aviationstack',
    };
  }

  private async aviationStackGet<T>(path: string, params: Record<string, any>): Promise<T> {
    const baseUrl = this.configService.get<string>('AVIATIONSTACK_BASE_URL') ?? 'https://api.aviationstack.com/v1';
    const url = `${baseUrl}${path}`;
    
    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(url, { params }),
      );
      
      // Check for API error in response body (AviationStack returns 200 with error object)
      const data = response.data as any;
      if (data?.error) {
        this.logger.warn(`AviationStack API error: ${JSON.stringify(data.error)}`);
        throw new HttpException(
          data.error.info || 'AviationStack API error',
          data.error.code === 'usage_limit_reached' ? HttpStatus.TOO_MANY_REQUESTS : HttpStatus.BAD_REQUEST,
        );
      }
      
      return response.data;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      const status = error?.response?.status;
      const data = error?.response?.data;
      if (status) {
        this.logger.warn(
          `Upstream request failed (${status}) ${url}: ${this.safeStringify(data)}`,
        );
        throw new HttpException(
          {
            message: data?.message ?? data?.error ?? 'Upstream request failed',
            upstreamStatus: status,
          },
          status,
        );
      }
      throw error;
    }
  }

  private normalizeLiveFlight(entry: AviationStackResponse): NormalizedFlightSummary {
    const position = this.normalizePosition(entry);
    const origin = this.normalizeAirport(entry.departure);
    const destination = this.normalizeAirport(entry.arrival);
    const operator = this.normalizeOperator(entry);

    // Generate a unique ID from flight codes
    const id = entry.flight?.iata || entry.flight?.icao || entry.flight?.number || 
               `${entry.airline?.iata || 'XX'}${entry.flight?.number || Math.random().toString(36).substr(2, 6)}`;

    return {
      id,
      callsign: entry.flight?.icao || entry.flight?.iata,
      flightNumber: entry.flight?.iata || entry.flight?.icao,
      operator,
      origin,
      destination,
      position,
      status: entry.flight_status,
      lastUpdatedUtc: entry.live?.updated || new Date().toISOString(),
    };
  }

  private normalizeFlightDetails(entry: AviationStackResponse): NormalizedFlightDetails {
    const summary = this.normalizeLiveFlight(entry);

    return {
      ...summary,
      gate: {
        origin: entry.departure?.gate,
        destination: entry.arrival?.gate,
      },
      terminal: {
        origin: entry.departure?.terminal,
        destination: entry.arrival?.terminal,
      },
      scheduled: {
        off: entry.departure?.scheduled,
        on: entry.arrival?.scheduled,
      },
      estimated: {
        off: entry.departure?.estimated,
        on: entry.arrival?.estimated,
      },
      actual: {
        off: entry.departure?.actual,
        on: entry.arrival?.actual,
      },
      aircraft: entry.aircraft
        ? {
            registration: entry.aircraft.registration,
            type: entry.aircraft.iata || entry.aircraft.icao,
          }
        : undefined,
    };
  }

  private normalizeOperator(entry: AviationStackResponse): NormalizedOperator | undefined {
    const airline = entry.airline;
    if (!airline) {
      return undefined;
    }

    return {
      name: airline.name,
      icao: airline.icao,
      iata: airline.iata,
      callsign: airline.callsign,
    };
  }

  private normalizeAirport(entry?: AviationStackResponse): NormalizedAirport | undefined {
    if (!entry) {
      return undefined;
    }

    return {
      code: entry.iata || entry.icao,
      name: entry.airport,
      iata: entry.iata,
      icao: entry.icao,
      city: undefined, // Not provided by AviationStack in this endpoint
      country: undefined,
      countryCode: undefined,
      timezone: entry.timezone,
      latitude: undefined,
      longitude: undefined,
    };
  }

  private normalizePosition(entry: AviationStackResponse): NormalizedPosition | undefined {
    const live = entry.live;
    
    // AviationStack may not provide live data for all flights
    // Check if live object exists and has valid coordinates
    if (!live) {
      return undefined;
    }
    
    // Handle null/undefined values more carefully
    const latitude = live.latitude;
    const longitude = live.longitude;
    
    // Must have valid lat/lon to create position
    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
      return undefined;
    }
    
    // Validate lat/lon are valid numbers
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return undefined;
    }
    
    // Validate lat/lon are within valid ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return undefined;
    }

    return {
      latitude,
      longitude,
      altitude: live.altitude !== null && live.altitude !== undefined ? live.altitude : undefined,
      groundSpeed: live.speed_horizontal !== null && live.speed_horizontal !== undefined ? live.speed_horizontal : undefined,
      heading: live.direction !== null && live.direction !== undefined ? live.direction : undefined,
      isOnGround: live.is_ground ?? false,
      timestamp: live.updated || new Date().toISOString(),
    };
  }

  private resolveBounds(region?: string, bbox?: string) {
    if (bbox) {
      const [minLat, minLon, maxLat, maxLon] = bbox.split(',').map(Number);
      if ([minLat, minLon, maxLat, maxLon].every((value) => !Number.isNaN(value))) {
        return { minLat, minLon, maxLat, maxLon };
      }
    }

    const regionBounds: Record<string, { minLat: number; minLon: number; maxLat: number; maxLon: number }> = {
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

    // Altitude filters
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

    // Speed filters
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

    // Airline filter (if not already applied via API)
    if (query.airline) {
      const airlineFilter = query.airline.toLowerCase();
      const operatorMatch = flight.operator?.name?.toLowerCase().includes(airlineFilter);
      const iataMatch = flight.operator?.iata?.toLowerCase() === airlineFilter;
      const icaoMatch = flight.operator?.icao?.toLowerCase() === airlineFilter;
      if (!operatorMatch && !iataMatch && !icaoMatch) {
        return false;
      }
    }

    if (query.destinationCountry) {
      const country = flight.destination?.country?.toLowerCase();
      const countryCode = flight.destination?.countryCode?.toLowerCase();
      const target = query.destinationCountry.toLowerCase();
      if (country !== target && countryCode !== target) {
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
      destinationCountry: query.destinationCountry ?? null,
      max: query.max ?? null,
    })}`;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private safeStringify(data: unknown): string {
    try {
      return JSON.stringify(data);
    } catch {
      return String(data);
    }
  }
}
